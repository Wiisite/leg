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
              group: z.string().optional(),
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
        await createTeam(Number(tournamentId), t.name, t.shortName, t.color, t.logo ?? undefined, t.group);
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
          await createTeam(input.id, t.name, t.shortName, t.color, t.logo ?? undefined);
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
    .input(z.object({
      tournamentId: z.number(),
      // Modo: "auto" = sorteio automático, "manual" = admin escolheu os grupos
      mode: z.enum(["auto", "manual"]).default("auto"),
      // Apenas usado no modo manual: { teamId: number, group: "A" | "B" }
      manualGroups: z.array(z.object({
        teamId: z.number(),
        group: z.string(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB Error");
      
      const tournament = (await db.select().from(tournaments).where(eq(tournaments.id, input.tournamentId)))[0];
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });

      const teamList = await getTeamsByTournament(input.tournamentId);
      if (teamList.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Mínimo 2 equipes" });
      const existing = await getMatchesByPhase(input.tournamentId, "group");
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Confrontos já gerados" });

      const { updateTeamGroup } = await import("./db");
      const totalTeams = teamList.length;
      const numGroups = totalTeams <= 4 ? 1 : 2;
      const groups: (typeof teamList)[] = [];

      if (input.mode === "manual" && input.manualGroups && numGroups >= 2) {
        // ── Modo manual: admin definiu os grupos ──
        const groupMap = new Map(input.manualGroups.map(g => [g.teamId, g.group]));
        const groupA = teamList.filter(t => groupMap.get(t.id) === "A");
        const groupB = teamList.filter(t => groupMap.get(t.id) === "B");

        if (groupA.length < 2 || groupB.length < 2) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cada grupo precisa de no mínimo 2 equipes" });
        }

        groups.push(groupA, groupB);
        for (const t of groupA) await updateTeamGroup(t.id, "A");
        for (const t of groupB) await updateTeamGroup(t.id, "B");
      } else {
        // ── Modo automático: sorteio ──
        const shuffledTeams = [...teamList].sort(() => Math.random() - 0.5);

        if (numGroups === 1) {
          groups.push(shuffledTeams);
          for (const t of shuffledTeams) await updateTeamGroup(t.id, "A");
        } else {
          const groupA: typeof shuffledTeams = [];
          const groupB: typeof shuffledTeams = [];
          shuffledTeams.forEach((t, i) => {
            if (i % 2 === 0) groupA.push(t);
            else groupB.push(t);
          });
          groups.push(groupA, groupB);
          for (const t of groupA) await updateTeamGroup(t.id, "A");
          for (const t of groupB) await updateTeamGroup(t.id, "B");
        }
      }

      // Gera round-robin para cada grupo
      const GROUP_NAMES = ["A", "B"];
      for (let g = 0; g < groups.length; g++) {
        const groupTeams = [...groups[g]];
        if (groupTeams.length % 2 !== 0) {
          groupTeams.push({ id: -1, name: "BYE", shortName: "BYE", color: "#000", tournamentId: input.tournamentId, createdAt: new Date(), logo: null, groupName: GROUP_NAMES[g] } as any);
        }

        const n = groupTeams.length;
        const fullRounds = n - 1;
        const matchesPerRound = n / 2;
        const roundsToGenerate = tournament.rounds || fullRounds;

        for (let round = 1; round <= roundsToGenerate; round++) {
          for (let m = 0; m < matchesPerRound; m++) {
            const home = groupTeams[m];
            const away = groupTeams[n - 1 - m];
            if (home.id !== -1 && away.id !== -1) {
              await createMatch(input.tournamentId, "group", home.id, away.id, round);
            }
          }
          groupTeams.splice(1, 0, groupTeams.pop()!);
        }
      }

      await updateTournamentStatus(input.tournamentId, "group_stage");
      return { ok: true, groups: numGroups };
    }),

  getStandings: publicProcedure
    .input(z.object({ tournamentId: z.number() }))
    .query(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND" });
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");

      // Verifica se existem grupos definidos
      const groupNames = teamList.map(t => t.groupName).filter((g): g is string => g != null).filter((v, i, a) => a.indexOf(v) === i);

      if (groupNames.length <= 1) {
        // Grupo único — retorno flat (retrocompatível)
        return computeStandings(
          teamList,
          groupMatches,
          tournament.pointsPerWin,
          tournament.pointsPerDraw,
          tournament.pointsPerLoss,
          tournament.modality
        );
      }

      // Múltiplos grupos — retorna classificação separada por grupo
      const result: { groupName: string; standings: ReturnType<typeof computeStandings> }[] = [];
      for (const gName of groupNames.sort()) {
        const groupTeams = teamList.filter(t => t.groupName === gName);
        const groupTeamIds = new Set(groupTeams.map(t => t.id));
        const gMatches = groupMatches.filter(m => groupTeamIds.has(m.homeTeamId) && groupTeamIds.has(m.awayTeamId));
        result.push({
          groupName: gName,
          standings: computeStandings(
            groupTeams,
            gMatches,
            tournament.pointsPerWin,
            tournament.pointsPerDraw,
            tournament.pointsPerLoss,
            tournament.modality
          ),
        });
      }
      return result;
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
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado" });
      const teamList = await getTeamsByTournament(input.tournamentId);
      const groupMatches = await getMatchesByPhase(input.tournamentId, "group");
      const unfinished = groupMatches.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há partidas da fase de grupos em aberto" });

      const allMatches = await getMatchesByTournament(input.tournamentId);
      const existingKnockout = allMatches.filter((m) => m.phase !== "group");
      if (existingKnockout.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mata-mata já gerado" });

      const groupNames = teamList.map(t => t.groupName).filter((g): g is string => g != null).filter((v, i, a) => a.indexOf(v) === i);

      if (groupNames.length >= 2) {
        const groupStandings: Record<string, ReturnType<typeof computeStandings>> = {};
        const sortedGroupNames = [...groupNames].sort();
        for (const gName of sortedGroupNames) {
          const gTeams = teamList.filter(t => t.groupName === gName);
          const gTeamIds = new Set(gTeams.map(t => t.id));
          const gMatches = groupMatches.filter(m => gTeamIds.has(m.homeTeamId) && gTeamIds.has(m.awayTeamId));
          groupStandings[gName] = computeStandings(
            gTeams, gMatches,
            tournament.pointsPerWin, tournament.pointsPerDraw, tournament.pointsPerLoss,
            tournament.modality
          );
        }

        const gA = groupStandings["A"] || groupStandings[sortedGroupNames[0]] || [];
        const gB = groupStandings["B"] || groupStandings[sortedGroupNames[1]] || [];

        if (tournament.modality === "handebol" || tournament.modality === "futsal") {
          if (teamList.length === 6) {
            if (gA.length < 3 || gB.length < 3)
              throw new TRPCError({ code: "BAD_REQUEST", message: "Cada grupo precisa de 3 equipes classificadas" });

            // Série Liga (Ouro)
            await createMatch(input.tournamentId, "semifinal", gA[0].teamId, gB[1].teamId, 1, "ouro");
            await createMatch(input.tournamentId, "semifinal", gA[1].teamId, gB[0].teamId, 2, "ouro");

            // Série Paulista (Prata) semifinal única
            await createMatch(input.tournamentId, "semifinal", gA[2].teamId, gB[2].teamId, 1, "prata");

            await updateTournamentStatus(input.tournamentId, "semifinals");
            return { ok: true };
          }

          if (teamList.length === 8) {
            if (gA.length < 4 || gB.length < 4)
              throw new TRPCError({ code: "BAD_REQUEST", message: "Cada grupo precisa de 4 equipes classificadas" });

            // Quartas de final (Série Liga - Ouro)
            await createMatch(input.tournamentId, "quarterfinal", gA[0].teamId, gB[3].teamId, 1, "ouro");
            await createMatch(input.tournamentId, "quarterfinal", gA[1].teamId, gB[2].teamId, 2, "ouro");
            await createMatch(input.tournamentId, "quarterfinal", gA[2].teamId, gB[1].teamId, 3, "ouro");
            await createMatch(input.tournamentId, "quarterfinal", gA[3].teamId, gB[0].teamId, 4, "ouro");

            await updateTournamentStatus(input.tournamentId, "semifinals");
            return { ok: true };
          }

          if (teamList.length === 4) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Com 4 equipes, a premiação é por classificação geral (sem mata-mata).",
            });
          }
        }

        // Padrão (demais modalidades): 1º A vs 2º B, 1º B vs 2º A
        if (gA.length < 2 || gB.length < 2)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cada grupo precisa de ao menos 2 equipes classificadas" });

        await createMatch(input.tournamentId, "semifinal", gA[0].teamId, gB[1].teamId, 1);
        await createMatch(input.tournamentId, "semifinal", gB[0].teamId, gA[1].teamId, 2);
      } else {
        // Grupo único — 1º vs 4º, 2º vs 3º
        const standings = computeStandings(
          teamList, groupMatches,
          tournament.pointsPerWin, tournament.pointsPerDraw, tournament.pointsPerLoss,
          tournament.modality
        );
        if (standings.length < 4)
          throw new TRPCError({ code: "BAD_REQUEST", message: "São necessárias ao menos 4 equipes" });
        await createMatch(input.tournamentId, "semifinal", standings[0].teamId, standings[3].teamId, 1);
        await createMatch(input.tournamentId, "semifinal", standings[1].teamId, standings[2].teamId, 2);
      }

      await updateTournamentStatus(input.tournamentId, "semifinals");
      return { ok: true };
    }),

  generateFinal: protectedProcedure
    .input(z.object({ tournamentId: z.number() }),)
    .mutation(async ({ input }) => {
      const tournament = await getTournamentById(input.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado" });

      const getWinner = (m: { homeScore: number | null; awayScore: number | null; homeTeamId: number; awayTeamId: number }) => {
        if ((m.homeScore ?? 0) >= (m.awayScore ?? 0)) return m.homeTeamId;
        return m.awayTeamId;
      };
      const getLoser = (m: { homeScore: number | null; awayScore: number | null; homeTeamId: number; awayTeamId: number }) => {
        if ((m.homeScore ?? 0) >= (m.awayScore ?? 0)) return m.awayTeamId;
        return m.homeTeamId;
      };

      if (tournament.modality === "handebol" || tournament.modality === "futsal") {
        const allMatches = await getMatchesByTournament(input.tournamentId);
        const quarterOuro = allMatches
          .filter((m) => m.phase === "quarterfinal" && m.bracket === "ouro")
          .sort((a, b) => a.round - b.round);

        // Fluxo com 8 equipes: quartas -> semis (ouro/prata) -> finais (ouro/prata)
        if (quarterOuro.length === 4) {
          if (quarterOuro.some((m) => m.status !== "finished")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há quartas de final em aberto" });
          }

          const semisOuro = allMatches.filter((m) => m.phase === "semifinal" && m.bracket === "ouro");
          const semisPrata = allMatches.filter((m) => m.phase === "semifinal" && m.bracket === "prata");

          if (semisOuro.length === 0 && semisPrata.length === 0) {
            const q1 = quarterOuro.find((m) => m.round === 1)!;
            const q2 = quarterOuro.find((m) => m.round === 2)!;
            const q3 = quarterOuro.find((m) => m.round === 3)!;
            const q4 = quarterOuro.find((m) => m.round === 4)!;

            await createMatch(input.tournamentId, "semifinal", getWinner(q1), getWinner(q3), 1, "ouro");
            await createMatch(input.tournamentId, "semifinal", getWinner(q2), getWinner(q4), 2, "ouro");
            await createMatch(input.tournamentId, "semifinal", getLoser(q1), getLoser(q3), 1, "prata");
            await createMatch(input.tournamentId, "semifinal", getLoser(q2), getLoser(q4), 2, "prata");
            await updateTournamentStatus(input.tournamentId, "semifinals");
            return { ok: true };
          }

          if (semisOuro.some((m) => m.status !== "finished") || semisPrata.some((m) => m.status !== "finished")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há semifinais em aberto" });
          }

          const existingFinals = allMatches.filter(
            (m) => (m.phase === "final" || m.phase === "third_place") && (m.bracket === "ouro" || m.bracket === "prata")
          );
          if (existingFinals.length > 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Finais já geradas" });
          }

          const so1 = semisOuro.find((m) => m.round === 1)!;
          const so2 = semisOuro.find((m) => m.round === 2)!;
          const sp1 = semisPrata.find((m) => m.round === 1)!;
          const sp2 = semisPrata.find((m) => m.round === 2)!;

          await createMatch(input.tournamentId, "third_place", getLoser(so1), getLoser(so2), 1, "ouro");
          await createMatch(input.tournamentId, "final", getWinner(so1), getWinner(so2), 1, "ouro");
          await createMatch(input.tournamentId, "third_place", getLoser(sp1), getLoser(sp2), 1, "prata");
          await createMatch(input.tournamentId, "final", getWinner(sp1), getWinner(sp2), 1, "prata");
          await updateTournamentStatus(input.tournamentId, "final");
          return { ok: true };
        }

        // Fluxo com 6 equipes: semis ouro + semi prata -> finais ouro -> final prata
        const semisOuro = allMatches
          .filter((m) => m.phase === "semifinal" && m.bracket === "ouro")
          .sort((a, b) => a.round - b.round);
        const semiPrata = allMatches.find((m) => m.phase === "semifinal" && m.bracket === "prata");

        if (semisOuro.length >= 2 && semiPrata) {
          if (semisOuro.some((m) => m.status !== "finished") || semiPrata.status !== "finished") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há semifinais em aberto" });
          }

          const finalsOuro = allMatches.filter((m) => m.phase === "final" && m.bracket === "ouro");
          const thirdOuro = allMatches.filter((m) => m.phase === "third_place" && m.bracket === "ouro");
          const finalPrata = allMatches.filter((m) => m.phase === "final" && m.bracket === "prata");

          if (finalsOuro.length === 0 && thirdOuro.length === 0) {
            const so1 = semisOuro.find((m) => m.round === 1)!;
            const so2 = semisOuro.find((m) => m.round === 2)!;
            await createMatch(input.tournamentId, "third_place", getLoser(so1), getLoser(so2), 1, "ouro");
            await createMatch(input.tournamentId, "final", getWinner(so1), getWinner(so2), 1, "ouro");
            await updateTournamentStatus(input.tournamentId, "final");
            return { ok: true };
          }

          if (finalPrata.length === 0) {
            const third = thirdOuro[0];
            if (!third || third.status !== "finished") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Finalize a disputa de 3º da Série Liga para gerar a final da Série Paulista",
              });
            }

            const quartaSerieLiga = getLoser(third);
            const vencedorPrata = getWinner(semiPrata);
            await createMatch(input.tournamentId, "final", quartaSerieLiga, vencedorPrata, 1, "prata");
            await updateTournamentStatus(input.tournamentId, "final");
            return { ok: true };
          }

          throw new TRPCError({ code: "BAD_REQUEST", message: "Finais já geradas" });
        }
      }

      const semis = await getMatchesByPhase(input.tournamentId, "semifinal");
      const unfinished = semis.filter((m) => m.status !== "finished");
      if (unfinished.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há semifinais em aberto" });
      const existing = await getMatchesByPhase(input.tournamentId, "final");
      if (existing.length > 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Final já gerada" });
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
        quarterfinal: allMatches.filter((m) => m.phase === "quarterfinal").map(enrich),
        semifinal: allMatches.filter((m) => m.phase === "semifinal").map(enrich),
        third_place: allMatches.filter((m) => m.phase === "third_place").map(enrich),
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

      // If Ouro final match finished, set champion
      if (match.phase === "final" && match.bracket !== "prata" && input.homeScore !== undefined && input.awayScore !== undefined) {
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
    const results: string[] = [];
    // Coluna logo
    try {
      await db.execute(sql`ALTER TABLE teams ADD COLUMN logo TEXT NULL`);
      results.push("Coluna logo adicionada!");
    } catch (e: any) {
      results.push("logo: " + e.message);
    }
    // Coluna groupName
    try {
      await db.execute(sql`ALTER TABLE teams ADD COLUMN groupName VARCHAR(2) NULL`);
      results.push("Coluna groupName adicionada!");
    } catch (e: any) {
      results.push("groupName: " + e.message);
    }
    // Coluna bracket em matches
    try {
      await db.execute(sql`ALTER TABLE matches ADD COLUMN bracket ENUM('ouro','prata') NULL`);
      results.push("Coluna bracket adicionada em matches!");
    } catch (e: any) {
      results.push("matches.bracket: " + e.message);
    }
    // Atualiza enum de phase em matches
    try {
      await db.execute(sql.raw("ALTER TABLE matches MODIFY COLUMN phase ENUM('group','quarterfinal','semifinal','third_place','final') NOT NULL"));
      results.push("Enum phase de matches atualizado!");
    } catch (e: any) {
      results.push("matches.phase: " + e.message);
    }
    return { success: true, message: results.join(" | ") };
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

