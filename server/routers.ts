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
  getSiteSettings,
  upsertSiteSettings,
} from "./db";
import { eq, and, sql } from "drizzle-orm";
import { matches, teams, tournaments } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { storagePut } from "./storage";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createContactMessage, getAllContactMessages, updateMessageStatus } from "./db";
import nodemailer from "nodemailer";

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
  setsWon?: number;
  setsLost?: number;
  setsAverage?: number;
  pointsWon?: number;
  pointsLost?: number;
  pointsAverage?: number;
  logo: string | null;
};

type VoleiSetScore = {
  home: number;
  away: number;
};

function parseVoleiSetsJson(value: string | null | undefined): VoleiSetScore[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const home = Number((item as Record<string, unknown>).home);
        const away = Number((item as Record<string, unknown>).away);
        if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
        if (home < 0 || away < 0) return null;
        return { home, away };
      })
      .filter((set): set is VoleiSetScore => !!set);
  } catch {
    return [];
  }
}

function computeStandings(
  teamList: { id: number; name: string; shortName: string; color: string; logo: string | null }[],
  groupMatches: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    voleiSetsJson?: string | null;
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

    if (modality === "volei") {
      const setScores = parseVoleiSetsJson(m.voleiSetsJson);
      const parsedHomeSets = setScores.reduce((acc, set) => acc + (set.home > set.away ? 1 : 0), 0);
      const parsedAwaySets = setScores.reduce((acc, set) => acc + (set.away > set.home ? 1 : 0), 0);

      const homeSets = setScores.length > 0 ? parsedHomeSets : m.homeScore;
      const awaySets = setScores.length > 0 ? parsedAwaySets : m.awayScore;

      if (homeSets === awaySets) continue;

      home.goalsFor += homeSets;
      home.goalsAgainst += awaySets;
      away.goalsFor += awaySets;
      away.goalsAgainst += homeSets;

      const homeRallyPoints =
        setScores.length > 0 ? setScores.reduce((acc, set) => acc + set.home, 0) : homeSets;
      const awayRallyPoints =
        setScores.length > 0 ? setScores.reduce((acc, set) => acc + set.away, 0) : awaySets;

      home.pointsWon = (home.pointsWon ?? 0) + homeRallyPoints;
      home.pointsLost = (home.pointsLost ?? 0) + awayRallyPoints;
      away.pointsWon = (away.pointsWon ?? 0) + awayRallyPoints;
      away.pointsLost = (away.pointsLost ?? 0) + homeRallyPoints;

      // No vôlei não existe empate — sempre há um vencedor
      const homeWon = homeSets > awaySets;
      const winner = homeWon ? home : away;
      const loser = homeWon ? away : home;
      const winnerSets = homeWon ? homeSets : awaySets;
      const loserSets = homeWon ? awaySets : homeSets;

      winner.won++;
      loser.lost++;

      // Melhor de 3 sets (2x0 ou 2x1)
      // Vitória direta (2x0): 3 pts vencedor / 0 pts perdedor
      // Vitória apertada (2x1): 2 pts vencedor / 1 pt perdedor
      const isDominant = winnerSets === 2 && loserSets === 0;

      if (isDominant) {
        winner.points += 3;
        loser.points += 0;
      } else {
        // 2x1
        winner.points += 2;
        loser.points += 1;
      }
    } else if (m.homeScore! > m.awayScore!) {
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      home.won++;
      home.points += pointsPerWin;
      away.lost++;
      away.points += pointsPerLoss;
    } else if (m.homeScore! < m.awayScore!) {
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      away.won++;
      away.points += pointsPerWin;
      home.lost++;
      home.points += pointsPerLoss;
    } else {
      home.goalsFor += m.homeScore;
      home.goalsAgainst += m.awayScore;
      away.goalsFor += m.awayScore;
      away.goalsAgainst += m.homeScore;

      home.drawn++;
      away.drawn++;
      home.points += pointsPerDraw;
      away.points += pointsPerDraw;
    }
  }
  const entries = Array.from(map.values());
  for (const entry of entries) {
    entry.goalDiff = entry.goalsFor - entry.goalsAgainst;
    if (modality === "volei") {
      entry.setsWon = entry.goalsFor;
      entry.setsLost = entry.goalsAgainst;
      entry.setsAverage = entry.goalsAgainst > 0 ? entry.goalsFor / entry.goalsAgainst : entry.goalsFor;
      entry.pointsWon = entry.pointsWon ?? 0;
      entry.pointsLost = entry.pointsLost ?? 0;
      entry.pointsAverage =
        entry.pointsLost > 0 ? entry.pointsWon / entry.pointsLost : entry.pointsWon;
    }
  }
  return entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (modality === "volei") {
      const setsAverageA = a.setsAverage ?? 0;
      const setsAverageB = b.setsAverage ?? 0;
      if (setsAverageB !== setsAverageA) return setsAverageB - setsAverageA;

      const pointsAverageA = a.pointsAverage ?? 0;
      const pointsAverageB = b.pointsAverage ?? 0;
      if (pointsAverageB !== pointsAverageA) return pointsAverageB - pointsAverageA;
    }
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

  getHomeNews: publicProcedure.query(async () => {
    const modalityLabelByKey: Record<string, string> = {
      futsal: "Futsal",
      basquete: "Basquete",
      volei: "Voleibol",
      handebol: "Handebol",
    };

    const tournaments = await getAllTournaments();
    const news: Array<{
      id: string;
      tournamentId: number;
      modalityKey: string;
      modalityLabel: string;
      headline: string;
      summary: string;
      formattedDate: string;
      priority: number;
      dateTs: number;
    }> = [];

    for (const tournament of tournaments) {
      const modalityKey = String(tournament.modality || "futsal").toLowerCase();
      const modalityLabel = modalityLabelByKey[modalityKey] ?? "Modalidade";
      const updatedAt = new Date(String((tournament as any).updatedAt ?? (tournament as any).createdAt ?? Date.now()));
      const dateTs = Number.isNaN(updatedAt.getTime()) ? Date.now() : updatedAt.getTime();
      const formattedDate = Number.isNaN(updatedAt.getTime())
        ? "Atualizado recentemente"
        : updatedAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });

      if (tournament.champion) {
        news.push({
          id: `champion-${tournament.id}`,
          tournamentId: tournament.id,
          modalityKey,
          modalityLabel,
          headline: `${tournament.champion} é campeão do ${tournament.name}`,
          summary: `A competição ${tournament.category} do ${modalityLabel.toLowerCase()} foi encerrada com título confirmado para ${tournament.champion}.`,
          formattedDate,
          priority: 120,
          dateTs,
        });
      }

      const teamList = await getTeamsByTournament(tournament.id);
      const groupMatches = await getMatchesByPhase(tournament.id, "group");
      const finishedGroupMatches = groupMatches.filter((m) => m.status === "finished" && m.homeScore !== null && m.awayScore !== null);

      const groupNames = teamList
        .map((t) => t.groupName)
        .filter((g): g is string => g != null)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();

      if (teamList.length > 0 && finishedGroupMatches.length > 0) {
        if (groupNames.length <= 1) {
          const standings = computeStandings(
            teamList,
            groupMatches,
            tournament.pointsPerWin,
            tournament.pointsPerDraw,
            tournament.pointsPerLoss,
            tournament.modality,
          );

          const leader = standings[0];
          const vice = standings[1];

          if (leader && leader.played > 0) {
            news.push({
              id: `leader-${tournament.id}`,
              tournamentId: tournament.id,
              modalityKey,
              modalityLabel,
              headline: `${leader.teamName} lidera ${tournament.category} no ${modalityLabel}`,
              summary: `Com ${leader.points} ponto${leader.points === 1 ? "" : "s"} em ${leader.played} jogo${leader.played === 1 ? "" : "s"}, a equipe está no topo da classificação do ${tournament.name}.`,
              formattedDate,
              priority: 100,
              dateTs,
            });
          }

          if (leader && vice && leader.played > 0 && vice.played > 0 && Math.abs(leader.points - vice.points) <= 1) {
            news.push({
              id: `race-${tournament.id}`,
              tournamentId: tournament.id,
              modalityKey,
              modalityLabel,
              headline: `Disputa acirrada pela liderança no ${tournament.name}`,
              summary: `${leader.teamName} (${leader.points} pts) e ${vice.teamName} (${vice.points} pts) brigam ponto a ponto pela ponta da tabela.`,
              formattedDate,
              priority: 90,
              dateTs,
            });
          }
        } else {
          for (const groupName of groupNames) {
            const groupTeams = teamList.filter((t) => t.groupName === groupName);
            const groupIds = new Set(groupTeams.map((t) => t.id));
            const groupOnlyMatches = groupMatches.filter((m) => groupIds.has(m.homeTeamId) && groupIds.has(m.awayTeamId));
            const standings = computeStandings(
              groupTeams,
              groupOnlyMatches,
              tournament.pointsPerWin,
              tournament.pointsPerDraw,
              tournament.pointsPerLoss,
              tournament.modality,
            );
            const leader = standings[0];
            if (!leader || leader.played === 0) continue;

            news.push({
              id: `leader-${tournament.id}-group-${groupName}`,
              tournamentId: tournament.id,
              modalityKey,
              modalityLabel,
              headline: `${leader.teamName} lidera o Grupo ${groupName} no ${tournament.name}`,
              summary: `Com ${leader.points} ponto${leader.points === 1 ? "" : "s"}, a equipe abre vantagem na categoria ${tournament.category} do ${modalityLabel.toLowerCase()}.`,
              formattedDate,
              priority: 95,
              dateTs,
            });
          }
        }
      }

      if (finishedGroupMatches.length === 0) {
        news.push({
          id: `status-${tournament.id}`,
          tournamentId: tournament.id,
          modalityKey,
          modalityLabel,
          headline: `${tournament.name} segue em preparação`,
          summary: `A competição da categoria ${tournament.category} no ${modalityLabel.toLowerCase()} está em fase inicial. Fique de olho nos próximos resultados.`,
          formattedDate,
          priority: 40,
          dateTs,
        });
      }
    }

    return news
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (b.dateTs !== a.dateTs) return b.dateTs - a.dateTs;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 8)
      .map(({ priority, dateTs, ...item }) => item);
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
        homeAndAway: z.boolean().default(false),
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
        input.rounds,
        input.homeAndAway
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
        homeAndAway: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // 1. Atualiza dados básicos do torneio
      const tournamentUpdateData: Parameters<typeof updateTournament>[1] = {
        name: input.name,
        category: input.category,
        modality: input.modality,
        rounds: input.rounds,
      };

      if (input.homeAndAway !== undefined) {
        tournamentUpdateData.homeAndAway = input.homeAndAway ? 1 : 0;
      }

      await updateTournament(input.id, tournamentUpdateData);

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
      const shouldGenerateHomeAndAway = numGroups === 1 && totalTeams === 4 && (tournament.homeAndAway ?? 0) === 1;
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
        const roundsToGenerate = shouldGenerateHomeAndAway ? fullRounds : (tournament.rounds || fullRounds);

        for (let round = 1; round <= roundsToGenerate; round++) {
          for (let m = 0; m < matchesPerRound; m++) {
            const home = groupTeams[m];
            const away = groupTeams[n - 1 - m];
            if (home.id !== -1 && away.id !== -1) {
              await createMatch(input.tournamentId, "group", home.id, away.id, round);
              if (shouldGenerateHomeAndAway) {
                await createMatch(input.tournamentId, "group", away.id, home.id, round + fullRounds);
              }
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

        if (tournament.modality === "handebol" || tournament.modality === "futsal" || tournament.modality === "basquete" || tournament.modality === "volei") {
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
        if (
          (tournament.modality === "handebol" ||
            tournament.modality === "futsal" ||
            tournament.modality === "basquete" ||
            tournament.modality === "volei") &&
          teamList.length === 4
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Com 4 equipes, a premiação é por classificação geral (sem mata-mata).",
          });
        }

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

      if (tournament.modality === "handebol" || tournament.modality === "futsal" || tournament.modality === "basquete" || tournament.modality === "volei") {
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
        voleiSets: z
          .array(
            z.object({
              home: z.number().int().min(0),
              away: z.number().int().min(0),
            })
          )
          .max(3)
          .optional(),
        time: z.string().max(20).optional(),
        location: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const match = await getMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Partida não encontrada" });

      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const tournament = await getTournamentById(match.tournamentId);
      if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado" });

      let effectiveHomeScore = input.homeScore;
      let effectiveAwayScore = input.awayScore;
      let voleiSetsJson: string | undefined;

      if (tournament.modality === "volei" && input.voleiSets !== undefined) {
        const normalizedSets = input.voleiSets
          .map((set) => ({
            home: Math.floor(set.home),
            away: Math.floor(set.away),
          }))
          .filter((set) => !(set.home === 0 && set.away === 0));

        if (normalizedSets.length < 2 || normalizedSets.length > 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No vôlei, informe 2 ou 3 sets válidos.",
          });
        }

        let homeSetWins = 0;
        let awaySetWins = 0;
        for (const set of normalizedSets) {
          if (set.home === set.away) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No vôlei não existe empate por set.",
            });
          }
          if (set.home > set.away) homeSetWins++;
          else awaySetWins++;
        }

        const hasWinner = homeSetWins === 2 || awaySetWins === 2;
        if (!hasWinner) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Resultado inválido: uma equipe precisa vencer 2 sets.",
          });
        }

        if (normalizedSets.length === 3 && (homeSetWins === 2 && awaySetWins === 0 || awaySetWins === 2 && homeSetWins === 0)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Resultado inválido: partida 2×0 deve ter apenas 2 sets lançados.",
          });
        }

        effectiveHomeScore = homeSetWins;
        effectiveAwayScore = awaySetWins;
        voleiSetsJson = JSON.stringify(normalizedSets);
      }

      const hasScoreUpdate = effectiveHomeScore !== undefined && effectiveAwayScore !== undefined;

      await db
        .update(matches)
        .set({
          ...(effectiveHomeScore !== undefined ? { homeScore: effectiveHomeScore, status: "finished" } : {}),
          ...(effectiveAwayScore !== undefined ? { awayScore: effectiveAwayScore, status: "finished" } : {}),
          ...(voleiSetsJson !== undefined ? { voleiSetsJson } : {}),
          ...(input.time !== undefined ? { time: input.time } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
        })
        .where(eq(matches.id, input.matchId));

      if (match.phase === "group" && hasScoreUpdate) {

        const isAdvancedModality =
          tournament.modality === "handebol" ||
          tournament.modality === "futsal" ||
          tournament.modality === "basquete" ||
          tournament.modality === "volei";

        const teamList = await getTeamsByTournament(match.tournamentId);
        const allMatches = await getMatchesByTournament(match.tournamentId);
        const knockoutMatches = allMatches.filter((m) => m.phase !== "group");
        const groupMatches = allMatches.filter((m) => m.phase === "group");
        const allGroupFinished = groupMatches.length > 0 && groupMatches.every((m) => m.status === "finished");

        if (isAdvancedModality && teamList.length === 4 && knockoutMatches.length === 0 && allGroupFinished) {
          const standings = computeStandings(
            teamList,
            groupMatches,
            tournament.pointsPerWin,
            tournament.pointsPerDraw,
            tournament.pointsPerLoss,
            tournament.modality
          );
          const championName = standings[0]?.teamName;
          if (championName) {
            await updateTournamentStatus(match.tournamentId, "finished", championName);
          }
        }
      }

      if (match.phase === "final" && hasScoreUpdate) {

        const isAdvancedModality =
          tournament.modality === "handebol" ||
          tournament.modality === "futsal" ||
          tournament.modality === "basquete" ||
          tournament.modality === "volei";

        const teamList = await getTeamsByTournament(match.tournamentId);

        if (!isAdvancedModality) {
          const winner =
            effectiveHomeScore! >= effectiveAwayScore! ? match.homeTeamId : match.awayTeamId;
          const championTeam = teamList.find((t) => t.id === winner);
          await updateTournamentStatus(match.tournamentId, "finished", championTeam?.name);
          return { ok: true };
        }

        const allMatches = await getMatchesByTournament(match.tournamentId);
        const knockoutMatches = allMatches.filter((m) => m.phase !== "group");
        const hasOpenKnockout = knockoutMatches.some((m) => m.status !== "finished");

        // Campeão sempre vem da final da Série Liga (Ouro)
        const ouroFinal = knockoutMatches.find((m) => m.phase === "final" && m.bracket !== "prata");
        if (!ouroFinal) {
          return { ok: true };
        }

        const ouroHomeScore = ouroFinal.id === match.id ? effectiveHomeScore : ouroFinal.homeScore;
        const ouroAwayScore = ouroFinal.id === match.id ? effectiveAwayScore : ouroFinal.awayScore;
        if (ouroHomeScore == null || ouroAwayScore == null || hasOpenKnockout) {
          return { ok: true };
        }

        const winner = ouroHomeScore >= ouroAwayScore ? ouroFinal.homeTeamId : ouroFinal.awayTeamId;
        const championTeam = teamList.find((t) => t.id === winner);
        await updateTournamentStatus(match.tournamentId, "finished", championTeam?.name);
      }
      return { ok: true };
    }),
});

// ─── Contact Router ────────────────────────────────────────────────────────────

const contactRouter = router({
  send: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        department: z.string().optional(),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      await createContactMessage({
        ...input,
        status: "new",
      });

      // Enviar E-mail (Opcional, depende de configuração SMTP)
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          await transporter.sendMail({
            from: `"Site LEG" <${process.env.SMTP_USER}>`,
            to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
            subject: `Nova Mensagem: ${input.department || "Contato Geral"}`,
            text: `Nome: ${input.name}\nE-mail: ${input.email}\nDepartamento: ${input.department || "N/A"}\n\nMensagem:\n${input.message}`,
            html: `
              <h2>Nova Mensagem de Contato</h2>
              <p><strong>Nome:</strong> ${input.name}</p>
              <p><strong>E-mail:</strong> ${input.email}</p>
              <p><strong>Departamento:</strong> ${input.department || "N/A"}</p>
              <p><strong>Mensagem:</strong></p>
              <p style="white-space: pre-wrap;">${input.message}</p>
            `,
          });
        } catch (error) {
          console.error("[Email] Falha ao enviar notificação:", error);
        }
      }

      return { success: true };
    }),

  list: protectedProcedure.query(async () => {
    return getAllContactMessages();
  }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "read", "archived"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateMessageStatus(input.id, input.status);
      return { success: true };
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
    // Coluna voleiSetsJson em matches
    try {
      await db.execute(sql`ALTER TABLE matches ADD COLUMN voleiSetsJson LONGTEXT NULL`);
      results.push("Coluna voleiSetsJson adicionada em matches!");
    } catch (e: any) {
      results.push("matches.voleiSetsJson: " + e.message);
    }
    // Coluna homeAndAway em tournaments
    try {
      await db.execute(sql`ALTER TABLE tournaments ADD COLUMN homeAndAway INT NOT NULL DEFAULT 0`);
      results.push("Coluna homeAndAway adicionada em tournaments!");
    } catch (e: any) {
      results.push("tournaments.homeAndAway: " + e.message);
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

const siteRouter = router({
  getSettings: publicProcedure.query(async () => {
    return getSiteSettings();
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        mainLogoUrl: z.string().trim().max(50_000_000).optional(),
        footerLogoUrl: z.string().trim().max(50_000_000).optional(),
        homeHighlightImageUrl: z.string().trim().max(50_000_000).optional(),
        homeHeroImages: z
          .object({
            futsal: z.string().trim().max(50_000_000).optional(),
            basquete: z.string().trim().max(50_000_000).optional(),
            volei: z.string().trim().max(50_000_000).optional(),
            handebol: z.string().trim().max(50_000_000).optional(),
          })
          .optional(),
        homeHeroTitles: z
          .object({
            futsal: z.string().trim().max(120).optional(),
            basquete: z.string().trim().max(120).optional(),
            volei: z.string().trim().max(120).optional(),
            handebol: z.string().trim().max(120).optional(),
          })
          .optional(),
        modalityBannerImages: z
          .object({
            futsal: z.string().trim().max(10_000_000).optional(),
            basquete: z.string().trim().max(10_000_000).optional(),
            volei: z.string().trim().max(10_000_000).optional(),
            handebol: z.string().trim().max(10_000_000).optional(),
          })
          .optional(),
        mainLogoFileDataUrl: z.string().max(10_000_000).optional(),
        footerLogoFileDataUrl: z.string().max(10_000_000).optional(),
        homeHighlightImageFileDataUrl: z.string().max(10_000_000).optional(),
        homeHeroImageFiles: z
          .object({
            futsal: z.string().max(50_000_000).optional(),
            basquete: z.string().max(50_000_000).optional(),
            volei: z.string().max(50_000_000).optional(),
            handebol: z.string().max(50_000_000).optional(),
            extra1: z.string().max(50_000_000).optional(),
            extra2: z.string().max(50_000_000).optional(),
          })
          .optional(),
        modalityBannerImageFiles: z
          .object({
            futsal: z.string().max(50_000_000).optional(),
            basquete: z.string().max(50_000_000).optional(),
            volei: z.string().max(50_000_000).optional(),
            handebol: z.string().max(50_000_000).optional(),
            extra1: z.string().max(50_000_000).optional(),
            extra2: z.string().max(50_000_000).optional(),
          })
          .optional(),
        partners: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              logoUrl: z.string().trim().max(50_000_000).optional(),
              logoFileDataUrl: z.string().max(50_000_000).optional(),
            })
          )
          .optional(),
        liveStreams: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(180),
              youtubeUrl: z.string().trim().url().max(10_000_000),
            })
          )
          .optional(),
        championshipAddresses: z.array(z.string().trim().min(1).max(250)).optional(),
        clinicsHeroImageUrl: z.string().trim().max(50_000_000).optional(),
        clinicsHeroImageFileDataUrl: z.string().max(50_000_000).optional(),
        aboutHeroImageUrl: z.string().trim().max(50_000_000).optional(),
        aboutHeroImageFileDataUrl: z.string().max(50_000_000).optional(),
        aboutMissionImageUrl: z.string().trim().max(50_000_000).optional(),
        aboutMissionImageFileDataUrl: z.string().max(50_000_000).optional(),
        contactHeroImageUrl: z.string().trim().max(50_000_000).optional(),
        contactHeroImageFileDataUrl: z.string().max(50_000_000).optional(),
        clinics: z.array(z.object({
          title: z.string().trim().min(1).max(200),
          description: z.string().trim().max(1000).optional(),
          imageUrl: z.string().max(50_000_000).optional(),
          imageFileDataUrl: z.string().max(50_000_000).optional(),
          details: z.array(z.string()).optional(),
        })).optional(),
        aboutClinics: z.array(z.object({
          title: z.string().trim().max(100).optional(),
          imageUrl: z.string().max(50_000_000).optional(),
          imageFileDataUrl: z.string().max(50_000_000).optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.openId !== "admin-master") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o Administrador Master pode alterar o site" });
      }

      const decodeDataUrl = (dataUrl: string) => {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Formato de imagem inválido para upload" });
        }
        return {
          mimeType: match[1],
          buffer: Buffer.from(match[2], "base64"),
        };
      };

      const extensionFromMime = (mimeType: string) => {
        const map: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
          "image/svg+xml": "svg",
        };
        return map[mimeType.toLowerCase()] || "bin";
      };

      const uploadImage = async (prefix: string, dataUrl: string) => {
        const { mimeType, buffer } = decodeDataUrl(dataUrl);
        const extension = extensionFromMime(mimeType);
        const key = `site-settings/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
        try {
          const uploaded = await storagePut(key, buffer, mimeType);
          return uploaded.url;
        } catch (error: any) {
          const message = String(error?.message || "");
          if (message.includes("Storage proxy credentials missing")) {
            return dataUrl;
          }
          throw error;
        }
      };

      const resolvedMainLogoUrl =
        input.mainLogoFileDataUrl && input.mainLogoFileDataUrl.length > 0
          ? await uploadImage("main-logo", input.mainLogoFileDataUrl)
          : undefined;

      const resolvedFooterLogoUrl =
        input.footerLogoFileDataUrl && input.footerLogoFileDataUrl.length > 0
          ? await uploadImage("footer-logo", input.footerLogoFileDataUrl)
          : undefined;

      const resolvedHomeHighlightImageUrl =
        input.homeHighlightImageFileDataUrl && input.homeHighlightImageFileDataUrl.length > 0
          ? await uploadImage("home-highlight", input.homeHighlightImageFileDataUrl)
          : undefined;

      const resolvedClinicsHeroImageUrl =
        input.clinicsHeroImageFileDataUrl && input.clinicsHeroImageFileDataUrl.length > 0
          ? await uploadImage("clinics-hero", input.clinicsHeroImageFileDataUrl)
          : undefined;

      const resolvedAboutHeroImageUrl =
        input.aboutHeroImageFileDataUrl && input.aboutHeroImageFileDataUrl.length > 0
          ? await uploadImage("about-hero", input.aboutHeroImageFileDataUrl)
          : undefined;

      const resolvedAboutMissionImageUrl =
        input.aboutMissionImageFileDataUrl && input.aboutMissionImageFileDataUrl.length > 0
          ? await uploadImage("about-mission", input.aboutMissionImageFileDataUrl)
          : undefined;

      const resolvedContactHeroImageUrl =
        input.contactHeroImageFileDataUrl && input.contactHeroImageFileDataUrl.length > 0
          ? await uploadImage("contact-hero", input.contactHeroImageFileDataUrl)
          : undefined;

      const resolvedClinics = input.clinics
        ? await Promise.all(
            input.clinics.map(async (c, i) => ({
              ...c,
              imageFileDataUrl: undefined,
              imageUrl:
                c.imageFileDataUrl && c.imageFileDataUrl.length > 0
                  ? await uploadImage(`clinic-${i}`, c.imageFileDataUrl)
                  : c.imageUrl,
            }))
          )
        : undefined;
      
      const resolvedAboutClinics = input.aboutClinics
        ? await Promise.all(
            input.aboutClinics.map(async (c, i) => ({
              ...c,
              imageFileDataUrl: undefined,
              imageUrl:
                c.imageFileDataUrl && c.imageFileDataUrl.length > 0
                  ? await uploadImage(`about-clinic-${i}`, c.imageFileDataUrl)
                  : c.imageUrl,
            }))
          )
        : undefined;

      const modalities = ["futsal", "basquete", "volei", "handebol", "extra1", "extra2"] as const;

      const resolveModalityImageMap = async (
        urlMap: Partial<Record<(typeof modalities)[number], string>> | undefined,
        fileMap: Partial<Record<(typeof modalities)[number], string>> | undefined,
        prefix: string
      ) => {
        const result: Record<string, string | null> = {};
        let hasAnyChange = false;

        for (const modality of modalities) {
          const fileData = fileMap?.[modality];
          if (fileData && fileData.length > 0) {
            result[modality] = await uploadImage(`${prefix}-${modality}`, fileData);
            hasAnyChange = true;
            continue;
          }

          if (urlMap && Object.prototype.hasOwnProperty.call(urlMap, modality)) {
            const trimmed = (urlMap[modality] || "").trim();
            result[modality] = trimmed.length > 0 ? trimmed : null;
            hasAnyChange = true;
          }
        }

        return hasAnyChange ? result : undefined;
      };

      const resolvedHomeHeroImages = await resolveModalityImageMap(
        input.homeHeroImages,
        input.homeHeroImageFiles,
        "home-hero"
      );

      const resolvedModalityBannerImages = await resolveModalityImageMap(
        input.modalityBannerImages,
        input.modalityBannerImageFiles,
        "modality-banner"
      );

      const resolvedPartners = input.partners
        ? await Promise.all(
            input.partners.map(async (p, index) => {
              const trimmedName = p.name.trim();
              if (!trimmedName) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Nome do parceiro é obrigatório" });
              }

              if (p.logoFileDataUrl && p.logoFileDataUrl.length > 0) {
                const uploadedLogoUrl = await uploadImage(`partner-${index + 1}`, p.logoFileDataUrl);
                return {
                  name: trimmedName,
                  logoUrl: uploadedLogoUrl,
                };
              }

              const trimmedLogoUrl = p.logoUrl?.trim() || "";
              if (!trimmedLogoUrl) {
                throw new TRPCError({ code: "BAD_REQUEST", message: `Logo do parceiro \"${trimmedName}\" é obrigatório` });
              }

              return {
                name: trimmedName,
                logoUrl: trimmedLogoUrl,
              };
            })
          )
        : undefined;

      return upsertSiteSettings({
        ...(resolvedMainLogoUrl !== undefined
          ? { mainLogoUrl: resolvedMainLogoUrl }
          : input.mainLogoUrl !== undefined
            ? { mainLogoUrl: input.mainLogoUrl.length > 0 ? input.mainLogoUrl : null }
          : {}),
        ...(resolvedFooterLogoUrl !== undefined
          ? { footerLogoUrl: resolvedFooterLogoUrl }
          : input.footerLogoUrl !== undefined
            ? { footerLogoUrl: input.footerLogoUrl.length > 0 ? input.footerLogoUrl : null }
          : {}),
        ...(resolvedHomeHighlightImageUrl !== undefined
          ? { homeHighlightImageUrl: resolvedHomeHighlightImageUrl }
          : input.homeHighlightImageUrl !== undefined
            ? { homeHighlightImageUrl: input.homeHighlightImageUrl.length > 0 ? input.homeHighlightImageUrl : null }
          : {}),
        ...(resolvedClinicsHeroImageUrl !== undefined
          ? { clinicsHeroImageUrl: resolvedClinicsHeroImageUrl }
          : input.clinicsHeroImageUrl !== undefined
            ? { clinicsHeroImageUrl: input.clinicsHeroImageUrl.length > 0 ? input.clinicsHeroImageUrl : null }
          : {}),
        ...(resolvedAboutHeroImageUrl !== undefined
          ? { aboutHeroImageUrl: resolvedAboutHeroImageUrl }
          : input.aboutHeroImageUrl !== undefined
            ? { aboutHeroImageUrl: input.aboutHeroImageUrl.length > 0 ? input.aboutHeroImageUrl : null }
          : {}),
        ...(resolvedAboutMissionImageUrl !== undefined
          ? { aboutMissionImageUrl: resolvedAboutMissionImageUrl }
          : input.aboutMissionImageUrl !== undefined
            ? { aboutMissionImageUrl: input.aboutMissionImageUrl.length > 0 ? input.aboutMissionImageUrl : null }
          : {}),
        ...(resolvedContactHeroImageUrl !== undefined
          ? { contactHeroImageUrl: resolvedContactHeroImageUrl }
          : input.contactHeroImageUrl !== undefined
            ? { contactHeroImageUrl: input.contactHeroImageUrl.length > 0 ? input.contactHeroImageUrl : null }
          : {}),
        ...(resolvedClinics !== undefined
          ? { clinicsJson: JSON.stringify(resolvedClinics) }
          : {}),
        ...(resolvedAboutClinics !== undefined
          ? { aboutClinicsJson: JSON.stringify(resolvedAboutClinics) }
          : {}),
        ...(resolvedHomeHeroImages !== undefined
          ? {
              homeHeroImages: resolvedHomeHeroImages,
            }
          : {}),
        ...(input.homeHeroTitles !== undefined
          ? {
              homeHeroTitles: {
                futsal: input.homeHeroTitles.futsal?.trim() || undefined,
                basquete: input.homeHeroTitles.basquete?.trim() || undefined,
                volei: input.homeHeroTitles.volei?.trim() || undefined,
                handebol: input.homeHeroTitles.handebol?.trim() || undefined,
              },
            }
          : {}),
        ...(resolvedModalityBannerImages !== undefined
          ? {
              modalityBannerImages: resolvedModalityBannerImages,
            }
          : {}),
        ...(resolvedPartners !== undefined
          ? {
              partners: resolvedPartners,
            }
          : {}),
        ...(input.liveStreams !== undefined
          ? {
              liveStreams: input.liveStreams.map((stream) => ({
                title: stream.title.trim(),
                youtubeUrl: stream.youtubeUrl.trim(),
              })),
            }
          : {}),
        ...(input.championshipAddresses !== undefined
          ? {
              championshipAddresses: input.championshipAddresses
                .map((address) => address.trim())
                .filter((address, index, arr) => address.length > 0 && arr.indexOf(address) === index),
            }
          : {}),
      });
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
  site: siteRouter,
  seed: seedRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;

