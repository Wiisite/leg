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
