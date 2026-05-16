import { getAllTournaments } from "./db";

async function diag() {
  try {
    console.log("Buscando campeonatos...");
    const t = await getAllTournaments();
    console.log(`Sucesso! Encontrados ${t.length} campeonatos.`);
    process.exit(0);
  } catch (e: any) {
    console.error("ERRO ao buscar campeonatos:");
    console.error(e.message);
    process.exit(1);
  }
}

diag();
