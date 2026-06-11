type TournamentLike = {
  id: number;
  name: string;
  category: string;
  modality: string;
};

type TeamLike = {
  id: number;
  name: string;
  shortName: string;
};

type AthleteLike = {
  id: number;
  teamId: number;
  name: string;
  number: number | null;
  position?: string | null;
};

type MatchLike = {
  id: number;
  phase: "group" | "quarterfinal" | "semifinal" | "third_place" | "final";
  round: number;
  homeTeamId: number;
  awayTeamId: number;
  date?: string | null;
  time?: string | null;
  location?: string | null;
};

type BuildMatchSheetsPdfInput = {
  tournament: TournamentLike;
  teams: TeamLike[];
  matches: MatchLike[];
  athletesByTeam: Record<number, AthleteLike[]>;
  generatedAt?: Date;
};

const PHASE_LABELS: Record<MatchLike["phase"], string> = {
  group: "Fase de Grupos",
  quarterfinal: "Quartas de Final",
  semifinal: "Semifinal",
  third_place: "Disputa de 3o Lugar",
  final: "Final",
};

const PHASE_ORDER: MatchLike["phase"][] = ["group", "quarterfinal", "semifinal", "third_place", "final"];

const MODALITY_LABELS: Record<string, string> = {
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Voleibol",
  handebol: "Handebol",
};

function normalizeForPdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "o")
    .replace(/[ª]/g, "a")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toAsciiSafe(value: string): string {
  const normalizedValue = normalizeForPdfText(value);
  let result = "";
  for (const char of normalizedValue) {
    const code = char.charCodeAt(0);
    result += code >= 32 && code <= 126 ? char : "?";
  }
  return result;
}

function escapePdfString(value: string): string {
  return toAsciiSafe(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fitCellText(value: string, maxChars: number): string {
  const text = normalizeForPdfText((value || "").trim());
  if (text.length <= maxChars) return text;
  const cut = Math.max(1, maxChars - 1);
  return `${text.slice(0, cut).trimEnd()}.`;
}

function formatDate(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function buildMatchSheetPages(input: BuildMatchSheetsPdfInput): string[][] {
  const { tournament, teams, matches, athletesByTeam } = input;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const modalityLabel = MODALITY_LABELS[String(tournament.modality || "").toLowerCase()] ?? tournament.modality;

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 28;
  const topMargin = 28;
  const bottomMargin = 28;
  const contentWidth = pageWidth - marginX * 2;

  const pages: string[][] = [];
  let commands: string[] = [];
  let cursorY = pageHeight - topMargin;

  const startPage = () => {
    if (commands.length > 0) pages.push(commands);
    commands = ["0.7 w", "0 0 0 RG", "0 0 0 rg"];
    cursorY = pageHeight - topMargin;
  };

  const text = (value: string, x: number, y: number, font: "F1" | "F2", size: number) => {
    commands.push("BT");
    commands.push(`/${font} ${size} Tf`);
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    commands.push(`(${escapePdfString(value)}) Tj`);
    commands.push("ET");
  };

  const rect = (x: number, y: number, w: number, h: number) => {
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  const fillRect = (x: number, y: number, w: number, h: number, gray: number) => {
    commands.push(`${gray} ${gray} ${gray} rg`);
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    commands.push("0 0 0 rg");
  };

  type Cell = { width: number; label?: string; value?: string; valueFont?: "F1" | "F2"; valueSize?: number };

  const drawRow = (cells: Cell[], rowHeight: number) => {
    const top = cursorY;
    const bottom = top - rowHeight;
    let x = marginX;
    for (const cell of cells) {
      rect(x, bottom, cell.width, rowHeight);
      if (cell.label) text(cell.label, x + 4, top - 8.5, "F2", 6);
      if (cell.value !== undefined && cell.value !== "") {
        const valueSize = cell.valueSize ?? 8.5;
        const valueY = cell.label ? top - 18 : top - (rowHeight / 2 + valueSize / 2 - 1);
        const maxChars = Math.floor((cell.width - 8) / (valueSize * 0.52));
        text(fitCellText(cell.value, maxChars), x + 4, valueY, cell.valueFont ?? "F1", valueSize);
      }
      x += cell.width;
    }
    cursorY = bottom;
  };

  const drawTeamTable = (team: TeamLike | undefined, label: string) => {
    const teamName = team?.name || "A definir";
    const roster = team ? (athletesByTeam[team.id] || []) : [];

    // Title bar
    const titleHeight = 16;
    fillRect(marginX, cursorY - titleHeight, contentWidth, titleHeight, 0.12);
    commands.push("1 1 1 rg");
    text(`${label}: ${teamName.toUpperCase()}`, marginX + 5, cursorY - 11, "F2", 8.5);
    commands.push("0 0 0 rg");
    cursorY -= titleHeight;

    // Column header
    const cols = [
      { key: "num", label: "No", width: 28 },
      { key: "name", label: "ATLETA", width: 245 },
      { key: "goals", label: "GOLS", width: 96 },
      { key: "yellow", label: "AMAR.", width: 50 },
      { key: "red", label: "VERM.", width: 50 },
      { key: "obs", label: "OBS.", width: contentWidth - 28 - 245 - 96 - 50 - 50 },
    ];

    const headerHeight = 14;
    {
      const top = cursorY;
      const bottom = top - headerHeight;
      let x = marginX;
      fillRect(marginX, bottom, contentWidth, headerHeight, 0.85);
      for (const col of cols) {
        rect(x, bottom, col.width, headerHeight);
        text(col.label, x + 4, top - 10, "F2", 7);
        x += col.width;
      }
      cursorY = bottom;
    }

    // Athlete rows + blank spares
    const rowHeight = 15;
    const spareRows = 4;
    const totalRows = roster.length + spareRows;
    for (let i = 0; i < totalRows; i++) {
      const athlete = roster[i];
      const top = cursorY;
      const bottom = top - rowHeight;
      let x = marginX;
      for (const col of cols) {
        rect(x, bottom, col.width, rowHeight);
        if (athlete) {
          if (col.key === "num" && athlete.number != null) {
            text(String(athlete.number), x + 4, top - 10.5, "F2", 8);
          } else if (col.key === "name") {
            const maxChars = Math.floor((col.width - 8) / (8 * 0.52));
            text(fitCellText(athlete.name, maxChars), x + 4, top - 10.5, "F1", 8);
          }
        }
        x += col.width;
      }
      cursorY = bottom;
    }

    // Captain / coach line
    const footHeight = 16;
    drawRow(
      [
        { width: contentWidth / 2, label: "CAPITAO (ASSINATURA)" },
        { width: contentWidth / 2, label: "TECNICO / PROFESSOR" },
      ],
      footHeight,
    );
    cursorY -= 8;
  };

  for (const match of [...matches].sort((a, b) => {
    const da = (a.date || "").trim();
    const db = (b.date || "").trim();
    if (da !== db) {
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    }
    const ta = (a.time || "").trim();
    const tb = (b.time || "").trim();
    if (ta !== tb) {
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    }
    const phaseDiff = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    return a.id - b.id;
  })) {
    startPage();

    const homeTeam = teamById.get(match.homeTeamId);
    const awayTeam = teamById.get(match.awayTeamId);

    // ─── Document title ───
    text("LEG - LIGA ESTUDANTIL", marginX, cursorY - 11, "F2", 13);
    text("SUMULA OFICIAL DE JOGO", marginX, cursorY - 27, "F2", 11);
    cursorY -= 38;

    // ─── Matchup row ───
    const half = (contentWidth - 30) / 2;
    drawRow(
      [
        { width: half, label: "EQUIPE A (MANDANTE)", value: homeTeam?.name || "A definir", valueFont: "F2" },
        { width: 30, value: "X", valueFont: "F2", valueSize: 12 },
        { width: half, label: "EQUIPE B (VISITANTE)", value: awayTeam?.name || "A definir", valueFont: "F2" },
      ],
      30,
    );

    // ─── Competition info ───
    drawRow(
      [
        { width: contentWidth * 0.5, label: "COMPETICAO", value: tournament.name },
        { width: contentWidth * 0.25, label: "CATEGORIA", value: tournament.category },
        { width: contentWidth * 0.25, label: "MODALIDADE", value: modalityLabel },
      ],
      26,
    );

    drawRow(
      [
        { width: contentWidth * 0.25, label: "DATA", value: formatDate(match.date) },
        { width: contentWidth * 0.2, label: "HORARIO", value: (match.time || "").trim() },
        { width: contentWidth * 0.3, label: "LOCAL / GINASIO", value: (match.location || "").trim() },
        { width: contentWidth * 0.25, label: "FASE", value: PHASE_LABELS[match.phase] },
      ],
      26,
    );

    // ─── Scoreboard ───
    drawRow(
      [
        { width: contentWidth * 0.18, label: "PLACAR", value: "" },
        { width: contentWidth * 0.205, label: "1o TEMPO" },
        { width: contentWidth * 0.205, label: "2o TEMPO" },
        { width: contentWidth * 0.205, label: "PRORROGACAO" },
        { width: contentWidth * 0.205, label: "FINAL" },
      ],
      28,
    );

    // ─── Arbitragem ───
    drawRow(
      [
        { width: contentWidth * 0.34, label: "ARBITRO" },
        { width: contentWidth * 0.33, label: "ANOTADOR / MESARIO" },
        { width: contentWidth * 0.33, label: "CRONOMETRISTA" },
      ],
      26,
    );

    cursorY -= 10;

    // ─── Team rosters ───
    drawTeamTable(homeTeam, "EQUIPE A");
    drawTeamTable(awayTeam, "EQUIPE B");

    // Footer note
    if (cursorY - 14 > bottomMargin) {
      text(
        "Observacoes / Ocorrencias: ____________________________________________________________________",
        marginX,
        bottomMargin + 6,
        "F1",
        7,
      );
    }
  }

  if (commands.length > 0) pages.push(commands);
  return pages;
}

export function buildMatchSheetsPdf(input: BuildMatchSheetsPdfInput): Buffer {
  const pages = buildMatchSheetPages(input);
  const safePages = pages.length > 0 ? pages : [["0.7 w", "0 0 0 RG", "0 0 0 rg"]];

  const pageWidth = 595;
  const pageHeight = 842;

  const catalogId = 1;
  const pagesId = 2;
  const regularFontId = 3;
  const boldFontId = 4;

  const objects: Record<number, string> = {};
  const pageObjectIds: number[] = [];
  let nextId = 5;

  for (const pageCommands of safePages) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjectIds.push(pageId);

    const streamContent = pageCommands.join("\n");
    const streamLength = Buffer.byteLength(streamContent, "latin1");

    objects[contentId] = `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects[regularFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[boldFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  const maxId = Math.max(...Object.keys(objects).map(Number));
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = new Array<number>(maxId + 1).fill(0);

  for (let id = 1; id <= maxId; id++) {
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${maxId + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let id = 1; id <= maxId; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
