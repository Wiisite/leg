import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, matches, siteSettings, teams, tournaments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

let _db: ReturnType<typeof drizzle> | null = null;
let _migrated = false;

export type SitePartner = {
  name: string;
  logoUrl: string;
};

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
          await fixColumn("matches", "bracket", "ENUM('ouro','prata') NULL");
          await fixColumn("tournaments", "homeAndAway", "INT NOT NULL DEFAULT 0");
          await fixColumn("users", "username", "VARCHAR(64) UNIQUE NULL");
          await fixColumn("users", "password", "TEXT NULL");

          try {
            await _db!.execute(
              sql.raw(
                "CREATE TABLE IF NOT EXISTS site_settings (id INT AUTO_INCREMENT PRIMARY KEY, mainLogoUrl TEXT NULL, footerLogoUrl TEXT NULL, partnersJson TEXT NULL, updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)"
              )
            );
          } catch (e) {
            // Ignora erro para manter startup resiliente
          }

          try {
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN mainLogoUrl LONGTEXT NULL"));
          } catch (e) {
            // Ignora erro caso já esteja no tipo correto
          }

          try {
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN footerLogoUrl LONGTEXT NULL"));
          } catch (e) {
            // Ignora erro caso já esteja no tipo correto
          }

          try {
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN partnersJson LONGTEXT NULL"));
          } catch (e) {
            // Ignora erro caso já esteja no tipo correto
          }

          try {
            await _db!.execute(
              sql.raw(
                "ALTER TABLE matches MODIFY COLUMN phase ENUM('group','quarterfinal','semifinal','third_place','final') NOT NULL"
              )
            );
          } catch (e) {
            // Ignora erro caso o tipo já esteja atualizado
          }
          
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
  rounds: number = 5,
  homeAndAway: boolean = false
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
    homeAndAway: homeAndAway ? 1 : 0,
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
  data: {
    name?: string;
    category?: string;
    modality?: "futsal" | "basquete" | "volei" | "handebol";
    rounds?: number;
    homeAndAway?: number;
  }
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
  phase: "group" | "quarterfinal" | "semifinal" | "third_place" | "final"
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
  phase: "group" | "quarterfinal" | "semifinal" | "third_place" | "final",
  homeTeamId: number,
  awayTeamId: number,
  round: number,
  bracket?: "ouro" | "prata"
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(matches).values({ tournamentId, phase, homeTeamId, awayTeamId, round, bracket });
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

// ─── Site Settings ─────────────────────────────────────────────────────────────

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) {
    return {
      mainLogoUrl: null,
      footerLogoUrl: null,
      partners: [] as SitePartner[],
    };
  }

  const rows = await db.select().from(siteSettings).limit(1);
  const row = rows[0];

  if (!row) {
    return {
      mainLogoUrl: null,
      footerLogoUrl: null,
      partners: [] as SitePartner[],
    };
  }

  let partners: SitePartner[] = [];
  if (row.partnersJson) {
    try {
      const parsed = JSON.parse(row.partnersJson);
      if (Array.isArray(parsed)) {
        partners = parsed
          .filter((p) => p && typeof p.name === "string" && typeof p.logoUrl === "string")
          .map((p) => ({
            name: p.name,
            logoUrl: p.logoUrl,
          }));
      }
    } catch (e) {
      partners = [];
    }
  }

  return {
    mainLogoUrl: row.mainLogoUrl,
    footerLogoUrl: row.footerLogoUrl,
    partners,
  };
}

export async function upsertSiteSettings(data: {
  mainLogoUrl?: string | null;
  footerLogoUrl?: string | null;
  partners?: SitePartner[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const rows = await db.select().from(siteSettings).limit(1);
  const existing = rows[0];

  const patch: {
    mainLogoUrl?: string | null;
    footerLogoUrl?: string | null;
    partnersJson?: string | null;
  } = {};

  if (data.mainLogoUrl !== undefined) patch.mainLogoUrl = data.mainLogoUrl;
  if (data.footerLogoUrl !== undefined) patch.footerLogoUrl = data.footerLogoUrl;
  if (data.partners !== undefined) patch.partnersJson = JSON.stringify(data.partners);

  if (existing && Object.keys(patch).length === 0) {
    return getSiteSettings();
  }

  if (existing) {
    await db.update(siteSettings).set(patch).where(eq(siteSettings.id, existing.id));
  } else {
    await db.insert(siteSettings).values({
      mainLogoUrl: data.mainLogoUrl ?? null,
      footerLogoUrl: data.footerLogoUrl ?? null,
      partnersJson: JSON.stringify(data.partners ?? []),
    });
  }

  return getSiteSettings();
}
