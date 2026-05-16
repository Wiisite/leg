import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

import { sql } from "drizzle-orm";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  checkDatabase: adminProcedure
    .query(async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { error: "DB not available" };

      const results: any = {};
      try {
        const [rows] = await db.execute(sql`DESCRIBE athletes`);
        results.athletes = rows;
      } catch (e: any) {
        results.athletesError = e.message;
      }

      try {
        const [rows] = await db.execute(sql`DESCRIBE match_events`);
        results.match_events = rows;
      } catch (e: any) {
        results.match_eventsError = e.message;
      }

      return results;
    }),

  forceSyncDatabase: adminProcedure
    .mutation(async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { error: "DB not available" };

      const results: any = {};
      
      // Criar tabela athletes
      try {
        await db.execute(sql.raw(`
          CREATE TABLE IF NOT EXISTS athletes (
            id int AUTO_INCREMENT PRIMARY KEY,
            teamId int NOT NULL,
            name varchar(255) NOT NULL,
            number int,
            photo longtext,
            document varchar(50),
            birthDate varchar(20),
            position varchar(50),
            status enum('active', 'suspended') NOT NULL DEFAULT 'active',
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `));
        
        // Buscar colunas após criar
        try {
          const [rows] = await db.execute(sql.raw(`DESCRIBE athletes`));
          results.athletes = rows;
        } catch (e) {
          results.athletes = "Tabela athletes criada";
        }
      } catch (e: any) {
        results.athletesError = e.message;
      }

      // Criar tabela match_events
      try {
        await db.execute(sql.raw(`
          CREATE TABLE IF NOT EXISTS match_events (
            id int AUTO_INCREMENT PRIMARY KEY,
            matchId int NOT NULL,
            teamId int NOT NULL,
            athleteId int,
            type enum('goal', 'yellow_card', 'red_card', 'suspension_2min', 'point_1', 'point_2', 'point_3', 'foul') NOT NULL,
            period int DEFAULT 1,
            minute int,
            createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `));
        
        // Buscar colunas após criar
        try {
          const [rows] = await db.execute(sql.raw(`DESCRIBE match_events`));
          results.match_events = rows;
        } catch (e) {
          results.match_events = "Tabela match_events criada";
        }
      } catch (e: any) {
        results.match_eventsError = e.message;
      }

      return results;
    }),

  testAthleteRegistration: adminProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { error: "DB not available" };

      const { athletes } = await import("../../drizzle/schema");
      
      try {
        const testName = `Atleta Teste ${new Date().getTime()}`;
        await db.insert(athletes).values({
          teamId: input.teamId,
          name: testName,
          number: 99,
          position: "Teste",
        });

        // Tentar ler de volta
        const { eq } = await import("drizzle-orm");
        const last = await db.select().from(athletes).where(eq(athletes.name, testName)).limit(1);
        
        return { success: true, athlete: last[0] };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),

  listTestAthletes: adminProcedure
    .query(async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return [];

      const { athletes } = await import("../../drizzle/schema");
      const { like, desc } = await import("drizzle-orm");
      
      // Listar apenas atletas que tenham "Teste" no nome para não misturar
      return await db.select()
        .from(athletes)
        .where(like(athletes.name, "%Teste%"))
        .orderBy(desc(athletes.id))
        .limit(10);
    }),

  testMatchEvent: adminProcedure
    .input(z.object({ matchId: z.number(), teamId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { error: "DB not available" };

      const { matchEvents } = await import("../../drizzle/schema");
      
      try {
        await db.insert(matchEvents).values({
          matchId: input.matchId,
          teamId: input.teamId,
          type: "goal",
          period: 1,
          minute: 10,
        });

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
