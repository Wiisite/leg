import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Iniciando migração de colunas em site_settings...");
  
  // Garantir que DATABASE_URL está no process.env para o getDb()
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não encontrada no ambiente.");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const columns = [
    { name: "clinicsHeroImageUrl", type: "TEXT" },
    { name: "aboutHeroImageUrl", type: "TEXT" },
    { name: "aboutMissionImageUrl", type: "TEXT" },
    { name: "contactHeroImageUrl", type: "TEXT" },
    { name: "clinicsJson", type: "LONGTEXT" }
  ];

  for (const col of columns) {
    try {
      console.log(`Adicionando coluna ${col.name}...`);
      await db.execute(sql.raw(`ALTER TABLE site_settings ADD COLUMN ${col.name} ${col.type} NULL`));
      console.log(`Coluna ${col.name} adicionada com sucesso.`);
    } catch (e: any) {
      if (e.message.includes("Duplicate column name") || e.message.includes("already exists")) {
        console.log(`Coluna ${col.name} já existe.`);
      } else {
        console.error(`Erro ao adicionar coluna ${col.name}:`, e.message);
      }
    }
  }

  console.log("Migração concluída.");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
