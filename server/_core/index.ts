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
import { buildTournamentMatchesPdf } from "../pdf/tournamentPdf";

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

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

  app.get("/api/tournaments/:id/pdf", async (req, res) => {
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
      const matches = await getMatchesByTournament(tournamentId);
      const pdfBuffer = buildTournamentMatchesPdf({ tournament, teams, matches });

      const safeName = String(tournament.name || `torneio-${tournamentId}`)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

      const fileName = `${safeName || `torneio-${tournamentId}`}-jogos.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      console.error("[Tournament PDF] Erro ao gerar PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Erro interno ao gerar PDF do torneio" });
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
