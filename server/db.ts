import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, matches, teams, tournaments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

let _db: ReturnType<typeof drizzle> | null = null;
let _migrated = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      
      // Rodar migrações programaticamente
      if (!_migrated) {
        try {
          console.log("[Database] Checking schema and migrations...");
          await migrate(_db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
          
          // Tenta adicionar colunas individualmente caso as migrações automáticas não cubram tudo
          // Usamos try/catch individual para cada coluna para não interromper se uma já existir
          const fixColumn = async (table: string, col: string, type: string) => {
            try {
              await _db!.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`));
              console.log(`[Database] Added column ${col} to ${table}`);
            } catch (e) {
              // Ignora erro se a coluna já existir
            }
          };

          await fixColumn("teams", "logo", "TEXT NULL");
          await fixColumn("teams", "groupName", "VARCHAR(2) NULL");
          await fixColumn("users", "username", "VARCHAR(64) UNIQUE NULL");
          await fixColumn("users", "password", "TEXT NULL");
          
          _migrated = true;
          console.log("[Database] Schema check completed.");
        } catch (migError) {
          console.error("[Database] Migration error (non-fatal):", migError);
          _migrated = true; 
        }
      }
    } catch (error) {
      console.warn("[Database] Failed to connect or migrate:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.username !== undefined) {
    values.username = user.username;
    updateSet.username = user.username;
  }
  if (user.password !== undefined) {
    values.password = user.password;
    updateSet.password = user.password;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAdminByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), eq(users.role, "admin")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "admin"));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

// ─── Tournaments ───────────────────────────────────────────────────────────────

export async function getAllTournaments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tournaments).orderBy(tournaments.createdAt);
}

export async function getTournamentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  return result[0];
}

export async function createTournament(
  name: string,
  category: string,
  modality: "futsal" | "basquete" | "volei" | "handebol" = "futsal",
  pointsPerWin: number = 3,
  pointsPerDraw: number = 1,
  pointsPerLoss: number = 0,
  rounds: number = 5
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tournaments).values({
    name,
    category,
    modality,
    pointsPerWin,
    pointsPerDraw,
    pointsPerLoss,
    rounds,
    status: "pending",
  });
  return result[0].insertId;
}

export async function updateTournamentStatus(
  id: number,
  status: "pending" | "group_stage" | "semifinals" | "final" | "finished",
  champion?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(tournaments)
    .set({ status, ...(champion !== undefined ? { champion } : {}) })
    .where(eq(tournaments.id, id));
}

export async function updateTournament(
  id: number,
  data: { name?: string; category?: string; modality?: "futsal" | "basquete" | "volei" | "handebol"; rounds?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(tournaments)
    .set(data)
    .where(eq(tournaments.id, id));
}

// ─── Teams ─────────────────────────────────────────────────────────────────────

export async function getTeamsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
}

export async function createTeam(
  tournamentId: number,
  name: string,
  shortName: string,
  color: string,
  logo?: string,
  groupName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(teams).values({ tournamentId, name, shortName, color, logo, groupName });
}

export async function updateTeamGroup(teamId: number, groupName: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(teams).set({ groupName }).where(eq(teams.id, teamId));
}

// ─── Matches ───────────────────────────────────────────────────────────────────

export async function getMatchesByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).where(eq(matches.tournamentId, tournamentId));
}

export async function getMatchesByPhase(
  tournamentId: number,
  phase: "group" | "semifinal" | "final"
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.phase, phase)));
}

export async function createMatch(
  tournamentId: number,
  phase: "group" | "semifinal" | "final",
  homeTeamId: number,
  awayTeamId: number,
  round: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(matches).values({ tournamentId, phase, homeTeamId, awayTeamId, round });
}

export async function updateMatchScore(
  matchId: number,
  homeScore: number,
  awayScore: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(matches)
    .set({ homeScore, awayScore, status: "finished" })
    .where(eq(matches.id, matchId));
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result[0];
}
