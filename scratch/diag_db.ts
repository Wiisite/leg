import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function diag() {
  const db = await getDb();
  if (!db) {
    console.error("DB not available");
    process.exit(1);
  }

  try {
    const tables = await db.execute(sql`SHOW TABLES`);
    console.log("Tables:", JSON.stringify(tables, null, 2));

    const columns = await db.execute(sql`DESCRIBE athletes`);
    console.log("Athletes Columns:", JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error("Error during diag:", err);
  }
  process.exit(0);
}

diag();
