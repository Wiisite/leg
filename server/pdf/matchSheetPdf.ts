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

type MatchEventLike = {
  id: number;
  matchId: number;
  teamId: number;
  athleteId: number | null;
  type: "goal" | "yellow_card" | "red_card" | "suspension_2min" | "point_1" | "point_2" | "point_3" | "foul";
  period?: number | null;
  minute?: number | null;
};

type BuildMatchSheetsPdfInput = {
  tournament: TournamentLike;
  teams: TeamLike[];
  matches: MatchLike[];
  athletesByTeam: Record<number, AthleteLike[]>;
  eventsByMatch?: Record<number, MatchEventLike[]>;
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

function parseIsoDate(value?: string | null): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getPortugueseWeekDay(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parsed = parseIsoDate(dateStr);
    if (!parsed) return "";
    const date = new Date(parsed.year, parsed.month - 1, parsed.day);
    const days = ["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"];
    return days[date.getDay()];
  } catch {
    return "";
  }
}

function buildMatchSheetPages(input: BuildMatchSheetsPdfInput): string[][] {
  const { tournament, teams, matches, athletesByTeam, eventsByMatch } = input;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const modalityLabel = MODALITY_LABELS[String(tournament.modality || "").toLowerCase()] ?? tournament.modality;

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 10;
  const topMargin = 10;
  const bottomMargin = 10;
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
      if (cell.label) text(cell.label, x + 4, top - 9.5, "F2", 6.5);
      if (cell.value !== undefined && cell.value !== "") {
        const valueSize = cell.valueSize ?? 8;
        // Quando há rótulo, o valor fica numa segunda linha ancorada a partir
        // da base da célula (não do topo), para nunca ultrapassar a borda
        // inferior em linhas mais baixas.
        const valueY = cell.label ? bottom + 3 : top - (rowHeight / 2 + valueSize / 2 - 1);
        const maxChars = Math.floor((cell.width - 8) / (valueSize * 0.52));
        text(fitCellText(cell.value, maxChars), x + 4, valueY, cell.valueFont ?? "F1", valueSize);
      }
      x += cell.width;
    }
    cursorY = bottom;
  };

  const drawTeamTable = (team: TeamLike | undefined, label: string, matchId: number) => {
    const teamName = team?.name || "A definir";
    const roster = team ? (athletesByTeam[team.id] || []) : [];

    // ── Equipe title bar ──
    const titleHeight = 13;
    fillRect(marginX, cursorY - titleHeight, contentWidth, titleHeight, 0.12);
    commands.push("1 1 1 rg");
    text(`${label}: ${teamName.toUpperCase()}`, marginX + 4, cursorY - 9, "F2", 8);
    commands.push("0 0 0 rg");
    cursorY -= titleHeight;

    // ── Player table columns ──
    const playerCols = [
      { key: "reg", label: "Registro", width: 32 },
      { key: "name", label: "Jogadores", width: 165 },
      { key: "num", label: "Nº", width: 20 },
      { key: "g1", label: "G1º", width: 20 },
      { key: "g2", label: "G2º", width: 20 },
      { key: "g3", label: "G3º", width: 20 },
      { key: "pen", label: "PEN", width: 20 },
      { key: "yellow", label: "Amar.", width: 26 },
      { key: "red", label: "Verm.", width: 26 },
    ];
    const playerWidth = 32 + 165 + 20 + 20 + 20 + 20 + 20 + 26 + 26; // 369
    const sideWidth = contentWidth - playerWidth; // 206

    // ── Header row ──
    const headerHeight = 13;
    {
      const top = cursorY;
      const bottom = top - headerHeight;
      fillRect(marginX, bottom, contentWidth, headerHeight, 0.85);
      let x = marginX;
      for (const col of playerCols) {
        rect(x, bottom, col.width, headerHeight);
        text(col.label, x + 2, top - 9, "F2", 6.5);
        x += col.width;
      }
      // Side header: Professor (single wide column)
      rect(x, bottom, sideWidth, headerHeight);
      text("Professor", x + 4, top - 9, "F2", 6.5);
      text("1º tempo", x + sideWidth - 50, top - 9, "F2", 6.5);
      cursorY = bottom;
    }

    // ── Athlete rows ──
    // Coluna lateral (tempos / faltas coletivas / capitão) segue o modelo
    // oficial da APEFI usado no Excel: cada período (1º/2º/3º tempo) tem seu
    // rótulo "COLET. Nº" seguido de 5 caixas para contar as faltas coletivas
    // (a partir da 6ª falta o time sofre tiro livre sem barreira). As marcas
    // "A"/"S"/":" (Árbitro/Súmula) aparecem uma única vez, junto ao início da
    // contagem do 1º tempo — o mesmo dado já tem campo próprio, com rótulo,
    // no bloco "Arbitragem" no topo da página.
    type SideRow = {
      colet?: string;
      tempoLabel?: string;
      num?: string;
      checkbox?: boolean;
      captain?: boolean;
      mark?: string;
    };
    const sideRows: SideRow[] = [
      { colet: "COLET. 1º", mark: "A" },
      { num: "1", checkbox: true, mark: "S" },
      { num: "2", checkbox: true, mark: ":" },
      { num: "3", checkbox: true },
      { num: "4", checkbox: true },
      { num: "5", checkbox: true },
      { tempoLabel: "2º tempo" },
      { colet: "COLET. 2º" },
      { num: "1", checkbox: true },
      { num: "2", checkbox: true },
      { num: "3", checkbox: true, captain: true },
      { num: "4", checkbox: true },
      { num: "5", checkbox: true },
      { tempoLabel: "3º tempo" },
      { colet: "COLET. 3º" },
      { num: "1", checkbox: true },
      { num: "2", checkbox: true },
      { num: "3", checkbox: true },
      { num: "4", checkbox: true },
      { num: "5", checkbox: true },
    ];

    const rowHeight = 11;
    const totalRows = sideRows.length;
    for (let i = 0; i < totalRows; i++) {
      const athlete = roster[i];
      const topRow = cursorY;
      const bottomRow = topRow - rowHeight;
      let xRow = marginX;

      // Player cells
      for (const col of playerCols) {
        rect(xRow, bottomRow, col.width, rowHeight);
        if (athlete) {
          if (col.key === "reg") {
            text(String(i + 1), xRow + 4, topRow - 7.5, "F1", 7);
          } else if (col.key === "name") {
            const maxChars = Math.floor((col.width - 4) / (7 * 0.52));
            text(fitCellText(athlete.name, maxChars), xRow + 3, topRow - 7.5, "F1", 7);
          } else if (col.key === "num" && athlete.number != null) {
            text(String(athlete.number), xRow + 4, topRow - 7.5, "F2", 7);
          }
        }
        xRow += col.width;
      }

      // Side cell (tempos / faltas coletivas / capitão)
      rect(xRow, bottomRow, sideWidth, rowHeight);
      const sx = xRow;
      const side = sideRows[i];
      if (side.colet) {
        text(side.colet, sx + 4, topRow - 7.5, "F2", 6.5);
      } else if (side.tempoLabel) {
        text(side.tempoLabel, sx + 4, topRow - 7.5, "F2", 6.5);
      } else if (side.num) {
        text(side.num, sx + 4, topRow - 7.5, "F1", 7);
        if (side.checkbox) rect(sx + 14, bottomRow + 2, 10, 7);
        if (side.captain) text("Capitão", sx + 30, topRow - 7.5, "F2", 6.5);
      }
      if (side.mark) text(side.mark, sx + sideWidth - 12, topRow - 7.5, "F1", 7);

      cursorY = bottomRow;
    }

    // ── Tec / Aux / Professor row ──
    const footHeight = 12;
    {
      const top = cursorY;
      const bottom = top - footHeight;
      rect(marginX, bottom, 75, footHeight);
      text("Tec:", marginX + 3, top - 8.5, "F2", 7);
      rect(marginX + 75, bottom, 75, footHeight);
      text("Aux:", marginX + 78, top - 8.5, "F2", 7);
      rect(marginX + 150, bottom, contentWidth - 150, footHeight);
      text("Professor:", marginX + 153, top - 8.5, "F2", 7);
      cursorY = bottom;
    }

    cursorY -= 4;
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


    // ─── Matchup row ───
    const half = (contentWidth - 24) / 2;
    drawRow(
      [
        { width: 55, label: "Equipe A", value: homeTeam?.name || "", valueFont: "F2", valueSize: 9 },
        { width: 24, value: "x", valueFont: "F2", valueSize: 12 },
        { width: 55, label: "Equipe B", value: awayTeam?.name || "", valueFont: "F2", valueSize: 9 },
        { width: contentWidth - 55 - 24 - 55, label: "Contagens", value: "1º Per. |   |  2º Per. |   |  3º Per. |   |  P. Extra |   |  Final |   |", valueFont: "F1", valueSize: 7.5 },
      ],
      22,
    );

    drawRow(
      [
        { width: contentWidth * 0.35, label: "Competição", value: tournament.name, valueFont: "F2", valueSize: 8.5 },
        { width: contentWidth * 0.65, label: "", value: "" },
      ],
      22,
    );

    const weekDay = getPortugueseWeekDay(match.date);
    drawRow(
      [
        { width: contentWidth * 0.25, label: "Data", value: formatDate(match.date), valueFont: "F2" },
        { width: contentWidth * 0.25, label: "Horário", value: (match.time || "").trim(), valueFont: "F2" },
        { width: contentWidth * 0.25, label: "Categoria", value: tournament.category, valueFont: "F2" },
        { width: contentWidth * 0.25, label: "Semana", value: weekDay || "Sábado", valueFont: "F2" },
      ],
      22,
    );

    drawRow(
      [
        { width: contentWidth * 0.55, label: "Ginásio", value: (match.location || "").trim(), valueFont: "F1", valueSize: 8.5 },
        { width: contentWidth * 0.45, label: "Cidade", value: "", valueFont: "F1" },
      ],
      22,
    );
    cursorY -= 1;

    // ─── Arbitragem / Horário ───
    const arbHeight = 48;
    const topArb = cursorY;
    const bottomArb = cursorY - arbHeight;
    rect(marginX, bottomArb, contentWidth, arbHeight);

    text("Arbitragem", marginX + 4, topArb - 9, "F2", 7);
    text("Árbitro:", marginX + 4, topArb - 22, "F1", 7);
    text("Anotador:", marginX + 4, topArb - 35, "F1", 7);

    commands.push(`0.5 w`);
    commands.push(`${(marginX + 45).toFixed(2)} ${(topArb - 22).toFixed(2)} m ${(marginX + 230).toFixed(2)} ${(topArb - 22).toFixed(2)} l S`);
    commands.push(`${(marginX + 45).toFixed(2)} ${(topArb - 35).toFixed(2)} m ${(marginX + 230).toFixed(2)} ${(topArb - 35).toFixed(2)} l S`);
    commands.push(`0.7 w`);

    // Right side: Horário grid
    commands.push(`${(marginX + 250).toFixed(2)} ${topArb.toFixed(2)} m ${(marginX + 250).toFixed(2)} ${bottomArb.toFixed(2)} l S`);
    const xGrid = marginX + 250;
    const wGrid = contentWidth - 250;
    const wCol = wGrid / 3;

    fillRect(xGrid, topArb - 10, wGrid, 10, 0.9);
    rect(xGrid, topArb - 10, wGrid, 10);
    text("Horário", xGrid + 4, topArb - 8, "F2", 6.5);
    text("Início", xGrid + wCol + 4, topArb - 8, "F2", 6.5);
    text("Término", xGrid + wCol * 2 + 4, topArb - 8, "F2", 6.5);

    const drawArbPeriodRow = (label: string, y: number) => {
      rect(xGrid, y, wGrid, 10);
      text(label, xGrid + 4, y + 2, "F1", 7);
      commands.push(`${(xGrid + wCol).toFixed(2)} ${(y + 10).toFixed(2)} m ${(xGrid + wCol).toFixed(2)} ${y.toFixed(2)} l S`);
      commands.push(`${(xGrid + wCol * 2).toFixed(2)} ${(y + 10).toFixed(2)} m ${(xGrid + wCol * 2).toFixed(2)} ${y.toFixed(2)} l S`);
    };

    drawArbPeriodRow("1º Per.", topArb - 20);
    drawArbPeriodRow("2º Per.", topArb - 30);
    drawArbPeriodRow("P. Extra", topArb - 40);

    cursorY = bottomArb - 4;

    // ─── Team rosters ───
    drawTeamTable(homeTeam, "EQUIPE A", match.id);
    drawTeamTable(awayTeam, "EQUIPE B", match.id);

    // ─── Footer Notes / Observations ───
    const obsHeight = 28;
    rect(marginX, bottomMargin, contentWidth, obsHeight);
    text("Observacoes / Ocorrencias:", marginX + 4, bottomMargin + obsHeight - 7, "F2", 7);
    commands.push(`0.5 w`);
    commands.push(`${(marginX + 2).toFixed(2)} ${(bottomMargin + 12).toFixed(2)} m ${(marginX + contentWidth - 2).toFixed(2)} ${(bottomMargin + 12).toFixed(2)} l S`);
    commands.push(`${(marginX + 2).toFixed(2)} ${(bottomMargin + 4).toFixed(2)} m ${(marginX + contentWidth - 2).toFixed(2)} ${(bottomMargin + 4).toFixed(2)} l S`);
    commands.push(`0.7 w`);
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
