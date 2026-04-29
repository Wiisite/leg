import {
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  username: varchar("username", { length: 64 }).unique(),
  password: text("password"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Tournaments ───────────────────────────────────────────────────────────────

export const tournaments = mysqlTable("tournaments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("Geral"),
  modality: mysqlEnum("modality", ["futsal", "basquete", "volei", "handebol"])
    .default("futsal")
    .notNull(),
  status: mysqlEnum("status", ["pending", "group_stage", "semifinals", "final", "finished"])
    .default("pending")
    .notNull(),
  champion: varchar("champion", { length: 255 }),
  pointsPerWin: int("pointsPerWin").default(3).notNull(),
  pointsPerDraw: int("pointsPerDraw").default(1).notNull(),
  pointsPerLoss: int("pointsPerLoss").default(0).notNull(),
  homeAndAway: int("homeAndAway").default(0).notNull(),
  rounds: int("rounds").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = typeof tournaments.$inferInsert;

// ─── Teams ─────────────────────────────────────────────────────────────────────

export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 10 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#1e40af"),
  logo: text("logo"),
  groupName: varchar("groupName", { length: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ─── Matches ───────────────────────────────────────────────────────────────────

export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  tournamentId: int("tournamentId").notNull(),
  phase: mysqlEnum("phase", ["group", "quarterfinal", "semifinal", "third_place", "final"]).notNull(),
  bracket: mysqlEnum("bracket", ["ouro", "prata"]),
  round: int("round").default(1).notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  time: varchar("time", { length: 20 }),
  location: varchar("location", { length: 255 }),
  status: mysqlEnum("status", ["scheduled", "finished"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ─── Site Settings ─────────────────────────────────────────────────────────────

export const siteSettings = mysqlTable("site_settings", {
  id: int("id").autoincrement().primaryKey(),
  mainLogoUrl: longtext("mainLogoUrl"),
  footerLogoUrl: longtext("footerLogoUrl"),
  homeHighlightImageUrl: longtext("homeHighlightImageUrl"),
  homeHeroImagesJson: longtext("homeHeroImagesJson"),
  modalityBannerImagesJson: longtext("modalityBannerImagesJson"),
  partnersJson: longtext("partnersJson"),
  liveStreamsJson: longtext("liveStreamsJson"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = typeof siteSettings.$inferInsert;
