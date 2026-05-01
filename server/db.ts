import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { contactMessages, InsertContactMessage, InsertUser, matches, siteSettings, teams, tournaments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";

let _db: ReturnType<typeof drizzle> | null = null;
let _migrated = false;

export type SitePartner = {
  name: string;
  logoUrl: string;
};

export type SiteLiveStream = {
  title: string;
  youtubeUrl: string;
};

export type SiteChampionshipAddress = string;

const MODALITY_KEYS = ["futsal", "basquete", "volei", "handebol"] as const;
type ModalityKey = (typeof MODALITY_KEYS)[number];
export type SiteModalityImageMap = Partial<Record<ModalityKey, string>>;
export type SiteModalityTextMap = Partial<Record<ModalityKey, string>>;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      
      // Rodar migrações programaticamente
      if (!_migrated) {
        try {
          try {
            console.log("[Database] Checking schema and migrations...");
            await migrate(_db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
          } catch (e) {
            console.error("[Database] Migration error (continuing with manual fixes):", e);
          }
          
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
          await fixColumn("matches", "voleiSetsJson", "LONGTEXT NULL");
          await fixColumn("tournaments", "homeAndAway", "INT NOT NULL DEFAULT 0");
          await fixColumn("users", "username", "VARCHAR(64) UNIQUE NULL");
          await fixColumn("users", "password", "TEXT NULL");

          // Migrações para site_settings
          await fixColumn("site_settings", "clinicsHeroImageUrl", "TEXT NULL");
          await fixColumn("site_settings", "aboutHeroImageUrl", "TEXT NULL");
          await fixColumn("site_settings", "aboutMissionImageUrl", "TEXT NULL");
          await fixColumn("site_settings", "contactHeroImageUrl", "TEXT NULL");
          await fixColumn("site_settings", "clinicsJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "homeHeroImagesJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "homeHeroTitlesJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "modalityBannerImagesJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "partnersJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "liveStreamsJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "championshipAddressesJson", "LONGTEXT NULL");
          await fixColumn("site_settings", "aboutClinicsJson", "LONGTEXT NULL");

          try {
            await _db!.execute(sql.raw("CREATE TABLE IF NOT EXISTS contact_messages (id INT AUTO_INCREMENT PRIMARY KEY, name TEXT NOT NULL, email VARCHAR(320) NOT NULL, department VARCHAR(100) NULL, message TEXT NOT NULL, status ENUM('new', 'read', 'archived') NOT NULL DEFAULT 'new', createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"));
          } catch (e) {}

          try {
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN mainLogoUrl LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN footerLogoUrl LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN homeHighlightImageUrl LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN partnersJson LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN homeHeroImagesJson LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN homeHeroTitlesJson LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN modalityBannerImagesJson LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN liveStreamsJson LONGTEXT NULL"));
            await _db!.execute(sql.raw("ALTER TABLE site_settings MODIFY COLUMN championshipAddressesJson LONGTEXT NULL"));
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
  const parseModalityImageMap = (value: string | null | undefined): SiteModalityImageMap => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return {};
      const out: SiteModalityImageMap = {};
      for (const key of MODALITY_KEYS) {
        const candidate = (parsed as Record<string, unknown>)[key];
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          out[key] = candidate;
        }
      }
      return out;
    } catch {
      return {};
    }
  };

  const parseModalityTextMap = (value: string | null | undefined): SiteModalityTextMap => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return {};
      const out: SiteModalityTextMap = {};
      for (const key of MODALITY_KEYS) {
        const candidate = (parsed as Record<string, unknown>)[key];
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          out[key] = candidate.trim();
        }
      }
      return out;
    } catch {
      return {};
    }
  };

  const parseLiveStreams = (value: string | null | undefined): SiteLiveStream[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const title = typeof (item as Record<string, unknown>).title === "string" ? (item as Record<string, string>).title.trim() : "";
          const youtubeUrl =
            typeof (item as Record<string, unknown>).youtubeUrl === "string"
              ? (item as Record<string, string>).youtubeUrl.trim()
              : "";
          if (!title || !youtubeUrl) return null;
          return { title, youtubeUrl };
        })
        .filter((entry): entry is SiteLiveStream => !!entry);
    } catch {
      return [];
    }
  };

  const parseChampionshipAddresses = (value: string | null | undefined): SiteChampionshipAddress[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
    } catch {
      return [];
    }
  };

  const db = await getDb();
  if (!db) {
    return {
      mainLogoUrl: null,
      footerLogoUrl: null,
      homeHighlightImageUrl: null,
      homeHeroImages: {} as SiteModalityImageMap,
      homeHeroTitles: {} as SiteModalityTextMap,
      modalityBannerImages: {} as SiteModalityImageMap,
      partners: [] as SitePartner[],
      liveStreams: [] as SiteLiveStream[],
      championshipAddresses: [] as SiteChampionshipAddress[],
      clinicsHeroImageUrl: null,
      aboutHeroImageUrl: null,
      aboutMissionImageUrl: null,
      contactHeroImageUrl: null,
      clinics: [] as any[],
      aboutClinics: [] as any[],
    };
  }

  const rows = await db.select().from(siteSettings).limit(1);
  const row = rows[0];

  if (!row) {
    return {
      mainLogoUrl: null,
      footerLogoUrl: null,
      homeHighlightImageUrl: null,
      homeHeroImages: {} as SiteModalityImageMap,
      homeHeroTitles: {} as SiteModalityTextMap,
      modalityBannerImages: {} as SiteModalityImageMap,
      partners: [] as SitePartner[],
      liveStreams: [] as SiteLiveStream[],
      championshipAddresses: [] as SiteChampionshipAddress[],
      clinicsHeroImageUrl: null,
      aboutHeroImageUrl: null,
      aboutMissionImageUrl: null,
      contactHeroImageUrl: null,
      clinics: [] as any[],
      aboutClinics: [] as any[],
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
    homeHighlightImageUrl: row.homeHighlightImageUrl,
    homeHeroImages: parseModalityImageMap(row.homeHeroImagesJson),
    homeHeroTitles: parseModalityTextMap((row as any).homeHeroTitlesJson),
    modalityBannerImages: parseModalityImageMap(row.modalityBannerImagesJson),
    partners,
    liveStreams: parseLiveStreams((row as any).liveStreamsJson),
    championshipAddresses: parseChampionshipAddresses((row as any).championshipAddressesJson),
    clinicsHeroImageUrl: row.clinicsHeroImageUrl,
    aboutHeroImageUrl: row.aboutHeroImageUrl,
    aboutMissionImageUrl: row.aboutMissionImageUrl,
    contactHeroImageUrl: row.contactHeroImageUrl,
    clinics: row.clinicsJson ? JSON.parse(row.clinicsJson) : [],
    aboutClinics: row.aboutClinicsJson ? JSON.parse(row.aboutClinicsJson) : [],
  };
}

export async function upsertSiteSettings(data: {
  mainLogoUrl?: string | null;
  footerLogoUrl?: string | null;
  homeHighlightImageUrl?: string | null;
  homeHeroImages?: SiteModalityImageMap;
  homeHeroTitles?: SiteModalityTextMap;
  modalityBannerImages?: SiteModalityImageMap;
  partners?: SitePartner[];
  liveStreams?: SiteLiveStream[];
  championshipAddresses?: SiteChampionshipAddress[];
  clinicsHeroImageUrl?: string | null;
  aboutHeroImageUrl?: string | null;
  aboutMissionImageUrl?: string | null;
  contactHeroImageUrl?: string | null;
  clinicsJson?: string | null;
  aboutClinicsJson?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const rows = await db.select().from(siteSettings).limit(1);
  const existing = rows[0];

  const patch: {
    mainLogoUrl?: string | null;
    footerLogoUrl?: string | null;
    homeHighlightImageUrl?: string | null;
    homeHeroImagesJson?: string | null;
    homeHeroTitlesJson?: string | null;
    modalityBannerImagesJson?: string | null;
    partnersJson?: string | null;
    liveStreamsJson?: string | null;
    championshipAddressesJson?: string | null;
    clinicsHeroImageUrl?: string | null;
    aboutHeroImageUrl?: string | null;
    aboutMissionImageUrl?: string | null;
    contactHeroImageUrl?: string | null;
    clinicsJson?: string | null;
    aboutClinicsJson?: string | null;
  } = {};

  if (data.mainLogoUrl !== undefined) patch.mainLogoUrl = data.mainLogoUrl;
  if (data.footerLogoUrl !== undefined) patch.footerLogoUrl = data.footerLogoUrl;
  if (data.homeHighlightImageUrl !== undefined) patch.homeHighlightImageUrl = data.homeHighlightImageUrl;
  if (data.homeHeroImages !== undefined) patch.homeHeroImagesJson = JSON.stringify(data.homeHeroImages);
  if (data.homeHeroTitles !== undefined) patch.homeHeroTitlesJson = JSON.stringify(data.homeHeroTitles);
  if (data.modalityBannerImages !== undefined) patch.modalityBannerImagesJson = JSON.stringify(data.modalityBannerImages);
  if (data.partners !== undefined) patch.partnersJson = JSON.stringify(data.partners);
  if (data.liveStreams !== undefined) patch.liveStreamsJson = JSON.stringify(data.liveStreams);
  if (data.championshipAddresses !== undefined) patch.championshipAddressesJson = JSON.stringify(data.championshipAddresses);
  if (data.clinicsHeroImageUrl !== undefined) patch.clinicsHeroImageUrl = data.clinicsHeroImageUrl;
  if (data.aboutHeroImageUrl !== undefined) patch.aboutHeroImageUrl = data.aboutHeroImageUrl;
  if (data.aboutMissionImageUrl !== undefined) patch.aboutMissionImageUrl = data.aboutMissionImageUrl;
  if (data.contactHeroImageUrl !== undefined) patch.contactHeroImageUrl = data.contactHeroImageUrl;
  if (data.clinicsJson !== undefined) patch.clinicsJson = data.clinicsJson;
  if (data.aboutClinicsJson !== undefined) patch.aboutClinicsJson = data.aboutClinicsJson;

  if (existing && Object.keys(patch).length === 0) {
    return getSiteSettings();
  }

  if (existing) {
    await db.update(siteSettings).set(patch).where(eq(siteSettings.id, existing.id));
  } else {
    await db.insert(siteSettings).values({
      mainLogoUrl: data.mainLogoUrl ?? null,
      footerLogoUrl: data.footerLogoUrl ?? null,
      homeHighlightImageUrl: data.homeHighlightImageUrl ?? null,
      homeHeroImagesJson: JSON.stringify(data.homeHeroImages ?? {}),
      homeHeroTitlesJson: JSON.stringify(data.homeHeroTitles ?? {}),
      modalityBannerImagesJson: JSON.stringify(data.modalityBannerImages ?? {}),
      partnersJson: JSON.stringify(data.partners ?? []),
      liveStreamsJson: JSON.stringify(data.liveStreams ?? []),
      championshipAddressesJson: JSON.stringify(data.championshipAddresses ?? []),
      clinicsHeroImageUrl: data.clinicsHeroImageUrl ?? null,
      aboutHeroImageUrl: data.aboutHeroImageUrl ?? null,
      aboutMissionImageUrl: data.aboutMissionImageUrl ?? null,
      contactHeroImageUrl: data.contactHeroImageUrl ?? null,
      clinicsJson: data.clinicsJson ?? null,
      aboutClinicsJson: data.aboutClinicsJson ?? null,
    });
  }

  return getSiteSettings();
}

// ─── Contact Messages ─────────────────────────────────────────────────────────

export async function createContactMessage(data: InsertContactMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(contactMessages).values(data);
}

export async function getAllContactMessages() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactMessages).orderBy(sql`${contactMessages.createdAt} DESC`);
}

export async function updateMessageStatus(id: number, status: "new" | "read" | "archived") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
}

export async function deleteMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(contactMessages).where(eq(contactMessages.id, id));
}
