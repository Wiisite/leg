import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMatch,
  createTeam,
  createTournament,
  getAllTournaments,
  getMatchesByPhase,
  getMatchesByTournament,
  getMatchById,
  getTeamsByTournament,
  getTournamentById,
  updateMatchScore,
  updateTournamentStatus,
  updateTournament,
  getDb,
} from "./db";
import { eq, and, sql } from "drizzle-orm";
import { matches, teams, tournaments } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Standings helper ──────────────────────────────────────────────────────────

type StandingEntry = {
  teamId: number;
  teamName: string;
  shortName: string;
  color: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  logo: string | null;
};

function computeStandings(
  teamList: { id: number; name: string; shortName: string; color: string; logo: string | null }[],
  groupMatches: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }[],
  pointsPerWin: number = 3,
  pointsPerDraw: number = 1,
  pointsPerLoss: number = 0,
  modality: string = "futsal"
): StandingEntry[] {
  const map = new Map<number, StandingEntry>();
  for (const t of teamList) {
    map.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      color: t.color,
      logo: t.logo,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }
  for (const m of groupMatches) {
    if (m.status !== "finished" || m.homeScore === null || m.awayScore === null) continue;
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (modality === "volei") {
      // No vôlei não existe empate — sempre há um vencedor
      const homeWon = m.homeScore! > m.awayScore!;
      const winner = homeWon ? home : away;
      const loser = homeWon ? away : home;
      const winnerSets = homeWon ? m.homeScore! : m.awayScore!;
      const loserSets = homeWon ? m.awayScore! : m.homeScore!;

      winner.won++;
      loser.lost++;

      // Melhor de 5 (3x0, 3x1, 3x2) ou Melhor de 3 (2x0, 2x1)
      // Vitória direta (3x0, 3x1, 2x0): 3 pts vencedor / 0 pts perdedor
      // Vitória apertada (3x2, 2x1):     2 pts vencedor / 1 pt perdedor
      const isDominant =
        (winnerSets === 3 && loserSets <= 1) ||
        (winnerSets === 2 && loserSets === 0);

      if (isDominant) {
        winner.points += 3;
        loser.points += 0;
      } else {
        // 3x2 ou 2x1
        winner.points += 2;
        loser.points += 1;
      }
    } else if (m.homeScore! > m.awayScore!) {
      home.won++;
      home.points += pointsPerWin;
      away.lost++;
      away.points += pointsPerLoss;
    } else if (m.homeScore! < m.awayScore!) {
      away.won++;
      away.points += pointsPerWin;
      home.lost++;
      home.points += pointsPerLoss;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += pointsPerDraw;
      away.points += pointsPerDraw;
    }
  }
  const entries = Array.from(map.values());
  for (const entry of entries) {
    entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
  }
  return entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    return b.goalsFor - a.goalsFor;
  });
}

// ─── Seed helper ───────────────────────────────────────────────────────────────

const DEFAULT_TEAMS = [
  { name: "Colégio Beryon", shortName: "BRY", color: "#1e3a8a" },
  { name: "Colégio Educar", shortName: "EDU", color: "#166534" },
  { name: "Colégio Santa Rita", shortName: "CSR", color: "#7c3aed" },
  { name: "Colégio Marconi", shortName: "MCN", color: "#b91c1c" },
  { name: "Colégio Parthenon", shortName: "PTH", color: "#d97706" },
  { name: "Colégio Canada", shortName: "CDA", color: "#0e7490" },
];

// ─── Tournament Router ─────────────────────────────────────────────────────────

const tournamentRouter = router({
  list: publicProcedure.query(async () => {
    return getAllTournaments();
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tournament = await getTournamentById(input.id);
    if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado" });
    const teamList = await getTeamsByTournament(input.id);
    const matchList = await getMatchesByTournament(input.id);
    return { tournament, teams: teamList, matches: matchList };
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        modality: z.enum(["futsal", "basquete", "volei", "handebol"]).default("futsal"),
        pointsPerWin: z.number().default(3),
        pointsPerDraw: z.number().default(1),
        pointsPerLoss: z.number().default(0),
        rounds: z.number().default(5),
        teams: z
          .array(
            z.object({
              name: z.string().min(1),
              shortName: z.string().min(1).max(10),
              color: z.string().default("#1e40af"),
              logo: z.string().nullable().optional(),
            }),
          )
          .min(2),
      })
    )
    .mutation(async ({ input }) => {
      const tournamentId = await createTournament(
        input.name,
        input.category,
        input.modality,
        input.pointsPerWin,
        input.pointsPerDraw,
        input.pointsPerLoss,
        input.rounds
      );
      
      for (const t of input.teams) {
        await createTeam(Number(tournamentId), t.name, t.shortName, t.color, t.logo);
      }
      return { id: Number(tournamentId) };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        category: z.string().min(1),
        modality: z.enum(["futsal", "basquete", "volei", "handebol"]),
        teams: z.array(
          z.object({
            id: z.number().optional(),
            name: z.string().min(1),
            shortName: z.string().min(1).max(10),
            color: z.string(),
            logo: z.string().nullable().optional(),
          })
        ),
        rounds: z.number().default(5),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // 1. Atualiza dados básicos do torneio
      await updateTournament(input.id, {
        name: input.name,
        category: input.category,
        modality: input.modality,
        rounds: input.rounds,
      });

      // 2. Gerencia equipes
      const existingTeams = await getTeamsByTournament(input.id);
      const inputTeamIds = input.teams.map(t => t.id).filter(Boolean);

      // Remover equipes que não estão no input
      for (const et of existingTeams) {
        if (!inputTeamIds.includes(et.id)) {
          await db.delete(teams).where(eq(teams.id, et.id));
        }
      }

      // Atualizar ou Criar equipes
      for (const t of input.teams) {
        if (t.id) {
          await db.update(teams)
            .set({ name: t.name, shortName: t.shortName, color: t.color, logo: t.logo })
            .where(eq(teams.id, t.id));
        } else {
          await createTeam(input.id, t.name, t.shortName, t.color, t.logo);
        }
      }

      return { ok: true };
    }),

  createDefault: protectedProcedure
    .input(z.object({ name: z.string().min(1), category: z.string().min(1) }),)
    .mutation(async ({ input }) => {
      await createTournament(input.name, input.category);
      const all = await getAllTournaments();
      const created = all[all.length - 1];
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const t of DEFAULT_TEAMS) {
        await createTeam(created.id, t.name, t.shortName, t.color);
      }
      return created;
    }),

  generateGroupMatches: protectedProcedure
    .input(z.object({ tournamentId: z.number() }),)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB Error");
      
      const tournament = (await db.select().from(tournaments).where(eq(tournaments.id, input.tournamentId)))[0];
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });

      const teamList = await getTeamsByTournament(input.tournamentId);
      if (teamList.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Mínimo 2 equipes" });
      const existing = await getMatchesByPhase(input.tournamentId, "group");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Confrontos já gerados" });

      // Sorteio (shuffle) das equipes
      const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);

      // Round-robin algorithm
      const teams = [...shuffledTeams];
      if (teams.length % 2 !== 0) {
        teams.push({ id: -1, name: "BYE", shortName: "BYE", color: "#000", tournamentId: input.tournamentId, createdAt: new Date(), logo: null });
      }

      const numTeams = teams.length;
      const fullRounds = numTeams - 1;
      const matchesPerRound = numTeams / 2;
      
      // Usa o número de rodadas do torneio ou o padrão do algoritmo
      const roundsToGenerate = tournament.rounds || fullRounds;

      for (let round = 1; round <= roundsToGenerate; round++) {
        // Se exceder o número de rodadas únicas do round-robin, o algoritmo rotaciona mas repete
        for (let match = 0; match < matchesPerRound; match++) {
          const home = teams[match];
          const away = teams[numTeams - 1 - match];

          if (home.id !== -1 && away.id !== -1) {
            await createMatch(input.tournamentId, "group", home.id, away.id, round);
          }
        }
        // Rotate teams (keep first team fixed)
        teams.splice(1, 0, teams.pop()!);
      }
      await updateTournamentStatus(input.tournamentId, "group_stage");
      return { ok: true };
    }),

  getStandings: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");
      return computeStandings(
        teamList,
        groupMatches,
        tournament.pointsPerWin,
        tournament.pointsPerDraw,
        tournament.pointsPerLoss,
        tournament.modality
      );
    }),

  delete: protectedProcedure
    .input(z.object({ tournamentId: z.number() }),)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // Delete matches, teams, and finally the tournament
      await db.delete(matches).where(eq(matches.tournamentId, input.tournamentId));
      await db.delete(teams).where(eq(teams.tournamentId, input.tournamentId));
      await db.delete(tournaments).where(eq(tournaments.id, input.tournamentId));
      
      return { ok: true };
    }),

  generateSemifinals: protectedProcedure
    .input(z.object({ tournamentId: z.number() }),)
    .mutation(async ({ input }) => {
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");
      const unfinished = groupMatches.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há partidas da fase de grupos em aberto" });
      const existing = await getMatchesByPhase(input.tournamentId, "semifinal");
      if (existing.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Semifinais já geradas" });
      const standings = computeStandings(teamList, groupMatches);
      if (standings.length < 4)
        throw new TRPCError({ code: "BAD_REQUEST", message: "São necessárias ao menos 4 equipes" });
      // 1st vs 4th, 2nd vs 3rd
      await createMatch(input.tournamentId, "semifinal", standings[0].teamId, standings[3].teamId, 1);
      await createMatch(input.tournamentId, "semifinal", standings[1].teamId, standings[2].teamId, 2);
      await updateTournamentStatus(input.tournamentId, "semifinals");
      return { ok: true };
    }),

  generateFinal: protectedProcedure
    .input(z.object({ tournamentId: z.number() }),)
    .mutation(async ({ input }) => {
      const semis = await getMatchesByPhase(input.tournamentId, "semifinal");
      const unfinished = semis.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há semifinais em aberto" });
      const existing = await getMatchesByPhase(input.tournamentId, "final");
      if (existing.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Final já gerada" });
      // Determine winners of each semi
      const getWinner = (m: typeof semis[0]) => {
        if (m.homeScore! > m.awayScore!) return m.homeTeamId;
        if (m.awayScore! > m.homeScore!) return m.awayTeamId;
        return m.homeTeamId; // tie-break: home advances
      };
      const semi1 = semis.find((m) => m.round === 1)!;
      const semi2 = semis.find((m) => m.round === 2)!;
      const finalist1 = getWinner(semi1);
      const finalist2 = getWinner(semi2);
      await createMatch(input.tournamentId, "final", finalist1, finalist2, 1);
      await updateTournamentStatus(input.tournamentId, "final");
      return { ok: true };
    }),

  getBracket: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const teamList = await getTeamsByTournament(input.tournamentId);
      const allMatches = await getMatchesByTournament(input.tournamentId);
      const teamMap = new Map(teamList.map((t) => [t.id, t]));
      const enrich = (m: (typeof allMatches)[0]) => ({
        ...m,
        homeTeam: teamMap.get(m.homeTeamId),
        awayTeam: teamMap.get(m.awayTeamId),
      });
      return {
        group: allMatches.filter((m) => m.phase === "group").map(enrich),
        semifinal: allMatches.filter((m) => m.phase === "semifinal").map(enrich),
        final: allMatches.filter((m) => m.phase === "final").map(enrich),
      };
    }),
});

// ─── Match Router ──────────────────────────────────────────────────────────────

const matchRouter = router({
  updateScore: protectedProcedure
    .input(
      z.object({
        matchId: z.number(),
        homeScore: z.number().min(0).optional(),
        awayScore: z.number().min(0).optional(),
        time: z.string().max(20).optional(),
        location: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const match = await getMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Partida não encontrada" });

      const db = await getDb();
      if (!db) throw new Error("DB not available");

      await db
        .update(matches)
        .set({
          ...(input.homeScore !== undefined ? { homeScore: input.homeScore, status: "finished" } : {}),
          ...(input.awayScore !== undefined ? { awayScore: input.awayScore, status: "finished" } : {}),
          ...(input.time !== undefined ? { time: input.time } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
        })
        .where(eq(matches.id, input.matchId));

      // If final match finished, set champion
      if (match.phase === "final" && input.homeScore !== undefined && input.awayScore !== undefined) {
        const winner =
          input.homeScore >= input.awayScore ? match.homeTeamId : match.awayTeamId;
        const teamList = await getTeamsByTournament(match.tournamentId);
        const championTeam = teamList.find((t) => t.id === winner);
        await updateTournamentStatus(match.tournamentId, "finished", championTeam?.name);
      }
      return { ok: true };
    }),
});

// ─── Seed Router ───────────────────────────────────────────────────────────────

const seedRouter = router({
  seedExample: protectedProcedure.mutation(async () => {
    await createTournament("Sub-9 MASC", "Sub-9 Masculino");
    const all = await getAllTournaments();
    const t = all[all.length - 1];
    if (!t) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    for (const team of DEFAULT_TEAMS) {
      await createTeam(t.id, team.name, team.shortName, team.color);
    }
    return t;
  }),

  fixDatabase: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    try {
      // Forçar a criação da coluna logo se ela não existir
      await db.execute(sql`ALTER TABLE teams ADD COLUMN logo TEXT NULL`);
      return { success: true, message: "Coluna logo adicionada!" };
    } catch (e: any) {
      return { success: false, message: "Coluna já existe ou erro: " + e.message };
    }
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    updateMe: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        username: z.string().optional(),
        password: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { upsertUser, getAdminByUsername } = await import("./db");
        
        // Se estiver tentando mudar o username, verifica se já existe
        if (input.username && input.username !== ctx.user?.username) {
          const existing = await getAdminByUsername(input.username);
          if (existing && existing.openId !== ctx.user?.openId) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Este nome de usuário já está em uso" 
            });
          }
        }

        // Normaliza campos vazios para não sobrescrever com string vazia
        const cleanInput: Record<string, unknown> = {};
        if (input.name) cleanInput.name = input.name;
        if (input.email) cleanInput.email = input.email;
        if (input.username) cleanInput.username = input.username;
        if (input.password) cleanInput.password = input.password;

        await upsertUser({
          openId: ctx.user!.openId,
          ...cleanInput,
        });
        return { success: true };
      }),
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        console.log(`[Auth] Tentativa de login para usuário: ${input.username}`);
        
        const { getAdminByUsername, upsertUser } = await import("./db");
        const MASTER_CODE = process.env.AUTH_SECRET || "LEG2026";
        let authenticatedUser: any = null;

        // 1. Tenta buscar no Banco de Dados primeiro (permite troca de senha do admin)
        const dbUser = await getAdminByUsername(input.username);
        
        if (dbUser && dbUser.password === input.password) {
          console.log(`[Auth] Usuário encontrado no banco: ${input.username}`);
          authenticatedUser = {
            openId: dbUser.openId,
            name: dbUser.name,
            email: dbUser.email,
            username: dbUser.username,
            loginMethod: "local",
            role: "admin",
          };
        } 
        // 2. Fallback para Login Mestre (caso a senha do banco falhe ou não exista)
        else if (input.username === "admin" && input.password === MASTER_CODE) {
          console.log(`[Auth] Login via chave mestra autorizado para: admin`);
          authenticatedUser = {
            openId: "admin-master",
            name: "Administrador LEG",
            email: "admin@ligaleg.com.br",
            username: "admin",
            loginMethod: "master",
            role: "admin",
          };
        }

        if (!authenticatedUser) {
          console.warn(`[Auth] Falha no login para: ${input.username} (Usuário não encontrado ou senha incorreta)`);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Usuário ou Senha inválidos",
          });
        }

        await upsertUser({
          ...authenticatedUser,
          lastSignedIn: new Date(),
        });

        const { sdk } = await import("./_core/sdk");
        const { ONE_YEAR_MS } = await import("@shared/const");
        
        const sessionToken = await sdk.createSessionToken(authenticatedUser.openId, {
          name: authenticatedUser.name || "Admin",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // Limpa com as opções exatas e também com opções genéricas para garantir
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
      ctx.res.clearCookie(COOKIE_NAME, { path: "/", maxAge: 0 });
      return { success: true } as const;
    }),
  }),

  staff: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.openId !== "admin-master") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o Administrador Master pode gerenciar a equipe" });
      }
      const { getAllAdmins } = await import("./db");
      return getAllAdmins();
    }),
    create: protectedProcedure
      .input(z.object({ 
        name: z.string(), 
        username: z.string(), 
        password: z.string() 
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.openId !== "admin-master") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        const { upsertUser, getAdminByUsername } = await import("./db");

        // Verifica se usuário já existe
        const existing = await getAdminByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário já cadastrado" });
        }

        await upsertUser({
          openId: `local:${input.username}`,
          name: input.name,
          username: input.username,
          password: input.password,
          role: "admin",
          loginMethod: "local",
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.openId !== "admin-master") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
        if (ctx.user?.id === input.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir a si mesmo" });
        }
        const { deleteUser } = await import("./db");
        await deleteUser(input.id);
        return { success: true };
      }),
  }),
  tournament: tournamentRouter,
  match: matchRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;

