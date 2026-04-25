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
} from "./db";
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
};

function computeStandings(
  teamList: { id: number; name: string; shortName: string; color: string }[],
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
      const homeWon = m.homeScore! > m.awayScore!;
      const winner = homeWon ? home : away;
      const loser = homeWon ? away : home;
      const winnerScore = homeWon ? m.homeScore! : m.awayScore!;
      const loserScore = homeWon ? m.awayScore! : m.homeScore!;

      if (winnerScore === 2 && loserScore === 0) {
        winner.points += 3;
        loser.points += 0;
      } else if (winnerScore === 2 && loserScore === 1) {
        winner.points += 2;
        loser.points += 1;
      } else {
        // Fallback para outros placares (ex: 3x0, 3x1)
        winner.points += pointsPerWin;
        loser.points += pointsPerLoss;
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
        teams: z
          .array(
            z.object({
              name: z.string().min(1),
              shortName: z.string().min(1).max(10),
              color: z.string().default("#1e40af"),
            })
          )
          .min(2),
      })
    )
    .mutation(async ({ input }) => {
      await createTournament(
        input.name,
        input.category,
        input.modality,
        input.pointsPerWin,
        input.pointsPerDraw,
        input.pointsPerLoss
      );
      const all = await getAllTournaments();
      const created = all[all.length - 1];
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const t of input.teams) {
        await createTeam(created.id, t.name, t.shortName, t.color);
      }
      return created;
    }),

  createDefault: protectedProcedure
    .input(z.object({ name: z.string().min(1), category: z.string().min(1) }))
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
    .input(z.object({ tournamentId: z.number() }))
    .mutation(async ({ input }) => {
      const teamList = await getTeamsByTournament(input.tournamentId);
      if (teamList.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Mínimo 2 equipes" });
      const existing = await getMatchesByPhase(input.tournamentId, "group");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Confrontos já gerados" });

      // Sorteio (shuffle) das equipes
      const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);

      // Round-robin single round (all vs all, once)
      let round = 1;
      for (let i = 0; i < shuffledTeams.length; i++) {
        for (let j = i + 1; j < shuffledTeams.length; j++) {
          await createMatch(input.tournamentId, "group", shuffledTeams[i].id, shuffledTeams[j].id, round);
          round++;
        }
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

  generateSemifinals: protectedProcedure
    .input(z.object({ tournamentId: z.number() }))
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
    .input(z.object({ tournamentId: z.number() }))
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

  checkAndSeed: publicProcedure.mutation(async () => {
    const all = await getAllTournaments();
    if (all.length === 0) {
      await createTournament("Sub-9 MASC", "Sub-9 Masculino");
      const updated = await getAllTournaments();
      const t = updated[updated.length - 1];
      if (!t) return { seeded: false };
      for (const team of DEFAULT_TEAMS) {
        await createTeam(t.id, team.name, team.shortName, team.color);
      }
      return { seeded: true, tournamentId: t.id };
    }
    return { seeded: false };
  }),
});

// ─── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tournament: tournamentRouter,
  match: matchRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
