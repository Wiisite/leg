import "dotenv/config";
import express from "express";
import { createServer } from "http";
import fs from "fs";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { buildModalitySchedulePdf } from "../pdf/modalitySchedulePdf";
import { buildMatchSheetsPdf } from "../pdf/matchSheetPdf";
import { buildVolleyMatchSheetsPdf } from "../pdf/volleyMatchSheetPdf";
import { buildStandingsPdf } from "../pdf/standingsPdf";
import { computeStandings } from "../routers";

const REGULATION_FILE_CANDIDATES_BY_MODALITY: Record<string, string[]> = {
  futsal: [
    "LEG_Regulamento_Futsal_2026_Oficial_futsal.pdf",
    "LEG_Regulamento_Futsal_2026_Oficial_futsal",
  ],
  basquete: [
    "LEG_Regulamento_Basquetebol_2026_Oficial.pdf",
    "LEG_Regulamento_Basquetebol_2026_Oficial",
  ],
  volei: [
    "LEG_Regulament_Voleibol_2026_Oficial .pdf",
    "LEG_Regulament_Voleibol_2026_Oficial",
  ],
  handebol: [
    "LEG_Regulamento_Handebol_2026_Oficial _handebol.pdf",
    "LEG_Regulamento_Handebol_2026_Oficial _handebol",
  ],
};

const REGULATION_KEYWORD_BY_MODALITY: Record<string, string> = {
  futsal: "futsal",
  basquete: "basquete",
  volei: "volei",
  handebol: "handebol",
};

const MODALITY_LABELS: Record<string, string> = {
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Voleibol",
  handebol: "Handebol",
};

const MONTH_LABELS: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Marco",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeForGrouping(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectDivisionLabel(tournamentName: string, category: string): string {
  const source = normalizeForGrouping(`${tournamentName} ${category}`);

  if (/(1a|1o|primeira|1\.)\s*divis/.test(source)) return "1a Divisao";
  if (/(2a|2o|segunda|2\.)\s*divis/.test(source)) return "2a Divisao";
  if (/(3a|3o|terceira|3\.)\s*divis/.test(source)) return "3a Divisao";
  if (/ouro/.test(source)) return "Serie Ouro";
  if (/prata/.test(source)) return "Serie Prata";
  return "Geral";
}

function parseIsoDate(value?: string | null): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function getBaseUrl(req: express.Request): string {
  const explicitUrl = (process.env.PUBLIC_APP_URL || "").trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string" && forwardedProto.length > 0
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;

  return `${protocol}://${req.get("host")}`;
}

function resolveRegulationFilePath(modality: string): string | null {
  const fileNames = REGULATION_FILE_CANDIDATES_BY_MODALITY[modality] ?? [];
  const modalityKeyword = REGULATION_KEYWORD_BY_MODALITY[modality] ?? modality;
  const baseDirs = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "client/public"),
  ];

  const candidateDirs = baseDirs.flatMap((baseDir) => [baseDir, path.join(baseDir, "regulamentos")]);

  for (const candidateDir of candidateDirs) {
    for (const fileName of fileNames) {
      const candidate = path.join(candidateDir, fileName);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  // fallback: localiza por padrão de nome para suportar pequenas variações no arquivo final
  for (const candidateDir of candidateDirs) {
    try {
      const files = fs.readdirSync(candidateDir);
      const match = files.find((file) => {
        const normalized = normalizeText(file);
        return (
          normalized.includes("regulament") &&
          normalized.includes(modalityKeyword) &&
          (normalized.endsWith(".pdf") || !normalized.includes("."))
        );
      });

      if (match) {
        return path.join(candidateDir, match);
      }
    } catch {
      // diretório não existe neste ambiente; segue para o próximo
    }
  }

  return null;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const server = createServer(app);

  // Serve locally uploaded images
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));

  // Health check endpoint — FIRST, before everything else
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/robots.txt", (req, res) => {
    const baseUrl = getBaseUrl(req);
    const robots = [
      "User-agent: *",
      "Allow: /",
      `Sitemap: ${baseUrl}/sitemap.xml`,
      "",
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(robots);
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const nowIso = new Date().toISOString();

      const staticPaths = [
        "/",
        "/ao-vivo",
        "/regulamentos",
        "/quem-somos",
        "/clinicas",
        "/contato",
        "/classificacao-geral",
        "/modalidade/futsal",
        "/modalidade/basquete",
        "/modalidade/volei",
        "/modalidade/handebol",
      ];

      const { getAllTournaments } = await import("../db");
      const tournaments = await getAllTournaments();
      const tournamentPaths = tournaments.map((item) => `/torneio/${item.id}`);

      const allPaths = Array.from(new Set(staticPaths.concat(tournamentPaths)));

      const urls = allPaths
        .map((pathItem) => {
          return [
            "  <url>",
            `    <loc>${baseUrl}${pathItem}</loc>`,
            `    <lastmod>${nowIso}</lastmod>`,
            "    <changefreq>daily</changefreq>",
            "    <priority>0.7</priority>",
            "  </url>",
          ].join("\n");
        })
        .join("\n");

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urls,
        "</urlset>",
      ].join("\n");

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.status(200).send(sitemap);
    } catch (error) {
      console.error("[SEO] Erro ao gerar sitemap.xml:", error);
      if (!res.headersSent) {
        res.status(500).send("Erro ao gerar sitemap.xml");
      }
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  app.get("/api/regulamentos/:modality", (req, res) => {
    try {
      const modality = String(req.params.modality || "").toLowerCase();
      if (!REGULATION_FILE_CANDIDATES_BY_MODALITY[modality]) {
        res.status(404).json({ message: "Modalidade de regulamento não encontrada" });
        return;
      }

      const filePath = resolveRegulationFilePath(modality);
      if (!filePath) {
        res.status(404).json({ message: "Arquivo de regulamento não encontrado no servidor" });
        return;
      }

      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(filePath, (err) => {
        if (!err) return;
        if (!res.headersSent) {
          res.status(404).json({ message: "Arquivo de regulamento não encontrado no servidor" });
        }
      });
    } catch (error) {
      console.error("[Regulamentos] Erro ao servir PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao carregar regulamento" });
      }
    }
  });

  app.get("/api/tournaments/:id/sumulas/pdf", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
        res.status(400).json({ message: "ID de torneio inválido" });
        return;
      }

      const {
        getTournamentById,
        getTeamsByTournament,
        getMatchesByTournament,
        getAthletesByTeam,
        getMatchEvents,
        getSiteSettings,
      } = await import("../db");
      const tournament = await getTournamentById(tournamentId);
      if (!tournament) {
        res.status(404).json({ message: "Torneio não encontrado" });
        return;
      }

      const [teams, matches, siteSettings] = await Promise.all([
        getTeamsByTournament(tournamentId),
        getMatchesByTournament(tournamentId),
        getSiteSettings(),
      ]);

      const athletesByTeam: Record<number, Awaited<ReturnType<typeof getAthletesByTeam>>> = {};
      await Promise.all(
        teams.map(async (team) => {
          athletesByTeam[team.id] = await getAthletesByTeam(team.id);
        })
      );

      const matchIdParam = req.query.matchId;
      const selectedMatchId = matchIdParam !== undefined ? Number(matchIdParam) : null;
      const matchesForPdf =
        selectedMatchId && Number.isFinite(selectedMatchId)
          ? matches.filter((m) => m.id === selectedMatchId)
          : matches;

      const eventsByMatch: Record<number, Awaited<ReturnType<typeof getMatchEvents>>> = {};
      await Promise.all(
        matchesForPdf.map(async (m) => {
          eventsByMatch[m.id] = await getMatchEvents(m.id);
        })
      );

      const isVolei = String(tournament.modality || "").toLowerCase() === "volei";
      const pdfBuffer = isVolei
        ? buildVolleyMatchSheetsPdf({
            tournament,
            teams,
            matches: matchesForPdf,
            athletesByTeam,
            contact: siteSettings.contactConfig,
          })
        : buildMatchSheetsPdf({
            tournament,
            teams,
            matches: matchesForPdf,
            athletesByTeam,
            eventsByMatch,
            contact: siteSettings.contactConfig,
          });

      const safeName = String(tournament.name || `torneio-${tournamentId}`)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const fileName = `${safeName || `torneio-${tournamentId}`}-sumulas.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[Match Sheets PDF] Erro ao gerar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao gerar súmulas em PDF" });
      }
    }
  });

  app.get("/api/tournaments/:id/standings/pdf", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
        res.status(400).json({ message: "ID de torneio inválido" });
        return;
      }

      const { getTournamentById, getTeamsByTournament, getMatchesByPhase } = await import("../db");
      const tournament = await getTournamentById(tournamentId);
      if (!tournament) {
        res.status(404).json({ message: "Torneio não encontrado" });
        return;
      }

      const teamList = await getTeamsByTournament(tournamentId);
      const groupMatches = await getMatchesByPhase(tournamentId, "group");
      const groupNames = teamList
        .map((t) => t.groupName)
        .filter((g): g is string => g != null)
        .filter((v, i, a) => a.indexOf(v) === i);

      const groups =
        groupNames.length <= 1
          ? [
              {
                groupName: null,
                standings: computeStandings(
                  teamList,
                  groupMatches,
                  tournament.pointsPerWin,
                  tournament.pointsPerDraw,
                  tournament.pointsPerLoss,
                  tournament.modality
                ),
              },
            ]
          : groupNames.sort().map((groupName) => {
              const groupTeams = teamList.filter((t) => t.groupName === groupName);
              const groupTeamIds = new Set(groupTeams.map((t) => t.id));
              const gMatches = groupMatches.filter(
                (m) => groupTeamIds.has(m.homeTeamId) && groupTeamIds.has(m.awayTeamId)
              );
              return {
                groupName,
                standings: computeStandings(
                  groupTeams,
                  gMatches,
                  tournament.pointsPerWin,
                  tournament.pointsPerDraw,
                  tournament.pointsPerLoss,
                  tournament.modality
                ),
              };
            });

      const pdfBuffer = buildStandingsPdf({
        tournamentName: tournament.name,
        category: tournament.category,
        modality: tournament.modality,
        groups,
      });

      const safeName = String(tournament.name || `torneio-${tournamentId}`)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const fileName = `${safeName || `torneio-${tournamentId}`}-classificacao.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[Standings PDF] Erro ao gerar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao gerar classificação em PDF" });
      }
    }
  });

  app.get("/api/tournaments/:id/schedule/pdf", async (req, res) => {
    try {
      const tournamentId = Number(req.params.id);
      if (!Number.isFinite(tournamentId) || tournamentId <= 0) {
        res.status(400).json({ message: "ID de torneio inválido" });
        return;
      }

      const { getTournamentById, getTeamsByTournament, getMatchesByTournament } = await import("../db");
      const tournament = await getTournamentById(tournamentId);
      if (!tournament) {
        res.status(404).json({ message: "Torneio não encontrado" });
        return;
      }

      const teams = await getTeamsByTournament(tournamentId);
      const teamById = new Map(teams.map((team) => [team.id, team]));
      const matches = await getMatchesByTournament(tournamentId);

      const rows = matches.map((match) => {
        const parsedDate = parseIsoDate(match.date);
        return {
          round: match.round || 1,
          formattedDate: parsedDate
            ? `${String(parsedDate.day).padStart(2, "0")}/${String(parsedDate.month).padStart(2, "0")}`
            : "-",
          time: String(match.time || "").trim() || "-",
          category: tournament.category,
          quadra: String(match.location || "").trim() || "-",
          homeTeam: teamById.get(match.homeTeamId)?.name || `Equipe ${match.homeTeamId}`,
          awayTeam: teamById.get(match.awayTeamId)?.name || `Equipe ${match.awayTeamId}`,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        };
      });

      const pdfBuffer = buildModalitySchedulePdf({
        modalityLabel: MODALITY_LABELS[String(tournament.modality || "").toLowerCase()] || tournament.modality,
        monthLabel: "",
        year: new Date().getFullYear(),
        rows,
        titleOverride: `LEG - Tabelao de Jogos - ${tournament.name}`,
        subtitleOverride: `Categoria: ${tournament.category}  |  Modalidade: ${tournament.modality}  |  Gerado em: ${new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      });

      const safeName = String(tournament.name || `torneio-${tournamentId}`)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const fileName = `${safeName || `torneio-${tournamentId}`}-tabelao.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[Tournament Schedule PDF] Erro ao gerar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao gerar PDF do tabelao" });
      }
    }
  });

  app.get("/api/modality/:modality/schedule/pdf", async (req, res) => {
    try {
      const modality = String(req.params.modality || "").toLowerCase();
      if (!MODALITY_LABELS[modality]) {
        res.status(400).json({ message: "Modalidade inválida" });
        return;
      }

      const now = new Date();
      const month = Number(req.query.month ?? now.getMonth() + 1);
      const year = Number(req.query.year ?? now.getFullYear());
      if (!Number.isFinite(month) || month < 1 || month > 12) {
        res.status(400).json({ message: "Mês inválido" });
        return;
      }
      if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        res.status(400).json({ message: "Ano inválido" });
        return;
      }

      const { getAllTournaments, getTeamsByTournament, getMatchesByTournament } = await import("../db");
      const tournaments = (await getAllTournaments()).filter(
        (item) => String(item.modality || "").toLowerCase() === modality
      );

      const rows: Array<{
        matchId: number;
        round: number;
        formattedDate: string;
        time: string;
        category: string;
        division: string;
        homeTeam: string;
        awayTeam: string;
        location: string;
        homeScore: number | null;
        awayScore: number | null;
      }> = [];

      for (const tournament of tournaments) {
        const teams = await getTeamsByTournament(tournament.id);
        const teamById = new Map(teams.map((team) => [team.id, team]));
        const matches = await getMatchesByTournament(tournament.id);
        const division = detectDivisionLabel(tournament.name, tournament.category);

        for (const match of matches) {
          const parsedDate = parseIsoDate(match.date);
          if (!parsedDate) continue;
          if (parsedDate.year !== year || parsedDate.month !== month) continue;

          rows.push({
            matchId: match.id,
            round: match.round || 1,
            formattedDate: `${String(parsedDate.day).padStart(2, "0")}/${String(parsedDate.month).padStart(2, "0")}`,
            time: String(match.time || "").trim() || "-",
            category: tournament.category,
            division,
            homeTeam: teamById.get(match.homeTeamId)?.name || `Equipe ${match.homeTeamId}`,
            awayTeam: teamById.get(match.awayTeamId)?.name || `Equipe ${match.awayTeamId}`,
            location: String(match.location || "").trim() || "-",
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          });
        }
      }

      const pdfBuffer = buildModalitySchedulePdf({
        modalityLabel: MODALITY_LABELS[modality],
        monthLabel: MONTH_LABELS[month] || String(month),
        year,
        rows: rows.map((row) => ({
          round: row.round,
          formattedDate: row.formattedDate,
          time: row.time,
          category: `${row.category} - ${row.division}`,
          quadra: row.location,
          homeTeam: row.homeTeam,
          awayTeam: row.awayTeam,
          homeScore: row.homeScore,
          awayScore: row.awayScore,
        })),
      });

      const fileName = `tabelao-${modality}-${year}-${String(month).padStart(2, "0")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[Modality Schedule PDF] Erro ao gerar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao gerar PDF do tabelão" });
      }
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, "0.0.0.0", () => {
    console.log(`[Server] Listening on port ${port} (Production: ${process.env.NODE_ENV === "production"})`);
  });

  // Pre-warm database connection so migrations run immediately
  try {
    const { getDb } = await import("../db");
    await getDb();
    console.log("[Server] Database connection established.");
  } catch (e) {
    console.error("[Server] Database pre-warm failed (non-fatal):", e);
  }
}

startServer().catch(console.error);
