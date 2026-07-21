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

type ContactLike = {
  officialEmail?: string | null;
  phone?: string | null;
  address?: string | null;
};

type BuildMatchSheetsPdfInput = {
  tournament: TournamentLike;
  teams: TeamLike[];
  matches: MatchLike[];
  athletesByTeam: Record<number, AthleteLike[]>;
  eventsByMatch?: Record<number, MatchEventLike[]>;
  contact?: ContactLike | null;
  generatedAt?: Date;
};

const PHASE_ORDER: MatchLike["phase"][] = ["group", "quarterfinal", "semifinal", "third_place", "final"];

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

type RGB = [number, number, number];
const BLUE: RGB = [0.09, 0.32, 0.64];
const GRAY_TEXT: RGB = [0.45, 0.45, 0.45];

function normalizeForPdfText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
  const { tournament, teams, matches, athletesByTeam, contact } = input;
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const pageWidth = PAGE_WIDTH;
  const pageHeight = PAGE_HEIGHT;
  const marginX = 10;
  const topMargin = 10;
  const contentWidth = pageWidth - marginX * 2; // 822

  const pages: string[][] = [];
  let commands: string[] = [];
  let cursorY = pageHeight - topMargin;

  const startPage = () => {
    if (commands.length > 0) pages.push(commands);
    commands = ["0.7 w", "0 0 0 RG", "0 0 0 rg"];
    cursorY = pageHeight - topMargin;
  };

  const text = (value: string, x: number, y: number, font: "F1" | "F2", size: number, color?: RGB) => {
    if (color) commands.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    commands.push("BT");
    commands.push(`/${font} ${size} Tf`);
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    commands.push(`(${escapePdfString(value)}) Tj`);
    commands.push("ET");
    if (color) commands.push("0 0 0 rg");
  };

  const estimateWidth = (value: string, font: "F1" | "F2", size: number): number =>
    normalizeForPdfText(value).length * size * (font === "F2" ? 0.58 : 0.5);

  const centerText = (value: string, cx: number, y: number, font: "F1" | "F2", size: number, color?: RGB) => {
    const w = estimateWidth(value, font, size);
    text(value, cx - w / 2, y, font, size, color);
  };

  const rect = (x: number, y: number, w: number, h: number) => {
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  const fillRect = (x: number, y: number, w: number, h: number, gray: number) => {
    commands.push(`${gray} ${gray} ${gray} rg`);
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    commands.push("0 0 0 rg");
  };

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    commands.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  // ── Bloco "Dados/Contagem/Arbitragem/Horários" (4 zonas lado a lado) ──
  const drawInfoGrid = (match: MatchLike) => {
    const blockHeight = 58;
    const blockTop = cursorY;
    const blockBottom = blockTop - blockHeight;

    const dadosW = 272;
    const contagemW = 129;
    const arbitragemW = 193;
    const horariosW = 228; // soma = 822

    const dadosX = marginX;
    const contagemX = dadosX + dadosW;
    const arbitragemX = contagemX + contagemW;
    const horariosX = arbitragemX + arbitragemW;

    rect(marginX, blockBottom, contentWidth, blockHeight);
    line(contagemX, blockTop, contagemX, blockBottom);
    line(arbitragemX, blockTop, arbitragemX, blockBottom);
    line(horariosX, blockTop, horariosX, blockBottom);

    // Zona Dados (4 linhas: Competição / Data / Categoria / Ginásio)
    {
      const rows: [string, string][] = [
        ["Competicao", tournament.name],
        ["Data", formatDate(match.date)],
        ["Categoria", tournament.category],
        ["Ginasio", (match.location || "").trim()],
      ];
      const rowH = blockHeight / rows.length;
      const labelW = 55;
      const valueMaxChars = Math.floor((dadosW - labelW - 6) / (7 * 0.5));
      rows.forEach(([label, value], i) => {
        const rowTop = blockTop - i * rowH;
        if (i > 0) line(dadosX, rowTop, dadosX + dadosW, rowTop);
        text(label, dadosX + 4, rowTop - rowH + 4, "F2", 6.5);
        text(fitCellText(value, valueMaxChars), dadosX + labelW, rowTop - rowH + 4, "F1", 7);
      });
    }

    // Zona Contagem (titulo + cabecalho A/B + 1º/2º/3º/Total)
    {
      const labelW = 42;
      const colW = (contagemW - labelW) / 2;
      const colAx = contagemX + labelW;
      const colBx = colAx + colW;
      const rowsLabels = ["1o Per.", "2o Per.", "3o Per.", "Total"];
      const rowH = blockHeight / (rowsLabels.length + 2);

      line(colAx, blockTop, colAx, blockBottom);
      line(colBx, blockTop, colBx, blockBottom);

      const titleRowTop = blockTop;
      text("Contagem", contagemX + 4, titleRowTop - rowH + 2, "F2", 6.5);
      line(contagemX, titleRowTop - rowH, contagemX + contagemW, titleRowTop - rowH);

      const headerRowTop = titleRowTop - rowH;
      centerText("A", colAx + colW / 2, headerRowTop - rowH + 2, "F2", 6.5);
      centerText("B", colBx + colW / 2, headerRowTop - rowH + 2, "F2", 6.5);
      line(contagemX, headerRowTop - rowH, contagemX + contagemW, headerRowTop - rowH);

      rowsLabels.forEach((label, i) => {
        const rowTop = headerRowTop - rowH - i * rowH;
        if (i > 0) line(contagemX, rowTop, contagemX + contagemW, rowTop);
        text(label, contagemX + 3, rowTop - rowH + 4, "F1", 6.5);
      });
    }

    // Zona Arbitragem (titulo + Arbitro / Arbitro / Anotador)
    {
      const rowsLabels = ["Arbitro", "Arbitro", "Anotador"];
      const rowH = blockHeight / (rowsLabels.length + 1);
      const labelW = 50;

      text("Arbitragem", arbitragemX + 4, blockTop - rowH + 2, "F2", 6.5);
      line(arbitragemX, blockTop - rowH, arbitragemX + arbitragemW, blockTop - rowH);

      rowsLabels.forEach((label, i) => {
        const rowTop = blockTop - rowH - i * rowH;
        if (i > 0) line(arbitragemX, rowTop, arbitragemX + arbitragemW, rowTop);
        text(label, arbitragemX + 4, rowTop - rowH + 4, "F1", 6.5);
        line(arbitragemX + labelW, rowTop - rowH + 3, arbitragemX + arbitragemW - 4, rowTop - rowH + 3);
      });
    }

    // Zona Horários (titulo + cabecalho Inicio/Termino + 1º/2º/P.Extra)
    {
      const labelW = 44;
      const colW = (horariosW - labelW) / 2;
      const colInicioX = horariosX + labelW;
      const colTerminoX = colInicioX + colW;
      const rowsLabels = ["1o Per.", "2o Per.", "P. Extra"];
      const rowH = blockHeight / (rowsLabels.length + 2);

      line(colInicioX, blockTop, colInicioX, blockBottom);
      line(colTerminoX, blockTop, colTerminoX, blockBottom);

      const titleRowTop = blockTop;
      text("Horarios", horariosX + 4, titleRowTop - rowH + 2, "F2", 6.5);
      line(horariosX, titleRowTop - rowH, horariosX + horariosW, titleRowTop - rowH);

      const headerRowTop = titleRowTop - rowH;
      centerText("Inicio", colInicioX + colW / 2, headerRowTop - rowH + 2, "F2", 6.5);
      centerText("Termino", colTerminoX + colW / 2, headerRowTop - rowH + 2, "F2", 6.5);
      line(horariosX, headerRowTop - rowH, horariosX + horariosW, headerRowTop - rowH);

      rowsLabels.forEach((label, i) => {
        const rowTop = headerRowTop - rowH - i * rowH;
        if (i > 0) line(horariosX, rowTop, horariosX + horariosW, rowTop);
        text(label, horariosX + 3, rowTop - rowH + 4, "F1", 6.5);
      });
    }

    cursorY = blockBottom;
  };

  // ── Roster de uma equipe (tabela de jogadores) ──
  const playerCols = [
    { key: "reg", label: "Reg.", weight: 22 },
    { key: "name", label: "Jogadores", weight: 143 },
    { key: "num", label: "Nº", weight: 16 },
    { key: "g1", label: "G1º", weight: 16 },
    { key: "g2", label: "G2º", weight: 16 },
    { key: "g3", label: "G3º", weight: 16 },
    { key: "pen", label: "PEN", weight: 16 },
    { key: "yellow", label: "Amar.", weight: 20 },
    { key: "red", label: "Verm.", weight: 20 },
  ];
  const ROSTER_ROWS = 22;
  const ROW_H = 13;

  const computeColWidths = (totalWidth: number): number[] => {
    const totalWeight = playerCols.reduce((sum, c) => sum + c.weight, 0);
    const widths = playerCols.map((c) => Math.round((totalWidth * c.weight) / totalWeight));
    const sumWidths = widths.reduce((sum, w) => sum + w, 0);
    const nameIdx = playerCols.findIndex((c) => c.key === "name");
    widths[nameIdx] += totalWidth - sumWidths;
    return widths;
  };

  const drawRosterTable = (x: number, width: number, label: string, team: TeamLike | undefined) => {
    const teamName = team?.name || "A definir";
    const roster = team ? athletesByTeam[team.id] || [] : [];
    const colWidths = computeColWidths(width);

    const titleH = 12;
    fillRect(x, cursorY - titleH, width, titleH, 0.12);
    text(`${label} - ${teamName.toUpperCase()}`, x + 4, cursorY - 8.5, "F2", 8, [1, 1, 1]);
    const titleBottom = cursorY - titleH;

    const headerH = 10;
    const headerBottom = titleBottom - headerH;
    fillRect(x, headerBottom, width, headerH, 0.85);
    let cx = x;
    for (let c = 0; c < playerCols.length; c++) {
      const col = playerCols[c];
      const colWidth = colWidths[c];
      rect(cx, headerBottom, colWidth, headerH);
      text(col.label, cx + 2, headerBottom + headerH / 2 - 2, "F2", 6);
      cx += colWidth;
    }

    let rowTop = headerBottom;
    for (let i = 0; i < ROSTER_ROWS; i++) {
      const athlete = roster[i];
      const rowBottom = rowTop - ROW_H;
      let colX = x;
      for (let c = 0; c < playerCols.length; c++) {
        const col = playerCols[c];
        const colWidth = colWidths[c];
        rect(colX, rowBottom, colWidth, ROW_H);
        if (athlete) {
          if (col.key === "reg") {
            text(String(i + 1), colX + 3, rowTop - ROW_H / 2 - 2, "F1", 6.5);
          } else if (col.key === "name") {
            const maxChars = Math.floor((colWidth - 4) / (6.5 * 0.5));
            text(fitCellText(athlete.name, maxChars), colX + 2, rowTop - ROW_H / 2 - 2, "F1", 6.5);
          } else if (col.key === "num" && athlete.number != null) {
            text(String(athlete.number), colX + 3, rowTop - ROW_H / 2 - 2, "F2", 6.5);
          }
        }
        colX += colWidth;
      }
      rowTop = rowBottom;
    }

    return titleH + headerH + ROSTER_ROWS * ROW_H;
  };

  // ── Falta coletiva (1º, 2º e 3º tempo) para uma equipe ──
  const drawFaltaColetiva = (x: number, width: number) => {
    const subW = width / 3;
    const labelH = 10;
    const valueH = 10;
    const top = cursorY;

    [
      ["Falta Coletiva 1o", x],
      ["Falta Coletiva 2o", x + subW],
      ["Falta Coletiva 3o", x + subW * 2],
    ].forEach(([label, sx]) => {
      const boxX = sx as number;
      rect(boxX, top - labelH - valueH, subW, labelH + valueH);
      line(boxX, top - labelH, boxX + subW, top - labelH);
      centerText(label as string, boxX + subW / 2, top - labelH / 2 - 2.5, "F2", 6.5);
      centerText("1 | 2 | 3 | 4 | 5 | 6 | 7", boxX + subW / 2, top - labelH - valueH / 2 - 2.5, "F1", 6.5);
    });

    return labelH + valueH;
  };

  // ── Linha "1º tempo" / "2º tempo" / "3º tempo" com placeholder de horário ──
  const drawTempoRow = (x: number, width: number) => {
    const subW = width / 3;
    const h = 14;
    const top = cursorY;

    [
      ["1o tempo", x],
      ["2o tempo", x + subW],
      ["3o tempo", x + subW * 2],
    ].forEach(([label, sx]) => {
      const boxX = sx as number;
      rect(boxX, top - h, subW, h);
      text(label as string, boxX + 4, top - h / 2 - 2, "F2", 7);
      text(":", boxX + subW - 22, top - h / 2 - 2, "F1", 9);
    });

    return h;
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
    const homeName = (homeTeam?.name || "A definir").toUpperCase();
    const awayName = (awayTeam?.name || "A definir").toUpperCase();

    // ─── Título ───
    centerText(`Sumula - ${homeName} x ${awayName}`, marginX + contentWidth / 2, cursorY - 10, "F2", 11);
    cursorY -= 16;

    // ─── Bloco da competição / contato ───
    centerText(tournament.name.toUpperCase(), marginX + contentWidth / 2, cursorY - 9, "F2", 10);
    cursorY -= 12;
    const contactParts = [contact?.officialEmail, contact?.phone, contact?.address]
      .map((v) => (v || "").trim())
      .filter(Boolean);
    if (contactParts.length > 0) {
      centerText(contactParts.join("  /  "), marginX + contentWidth / 2, cursorY - 6, "F1", 6.5, GRAY_TEXT);
      cursorY -= 10;
    }
    cursorY -= 4;

    // ─── Equipe A x Equipe B ───
    {
      const boxH = 30;
      const midW = 30;
      const sideW = (contentWidth - midW) / 2;
      const top = cursorY;
      const bottom = top - boxH;
      const midX = marginX + sideW;
      const rightX = midX + midW;

      rect(marginX, bottom, contentWidth, boxH);
      line(midX, top, midX, bottom);
      line(rightX, top, rightX, bottom);

      text("EQUIPE A", marginX + 4, top - 8, "F2", 6.5, GRAY_TEXT);
      centerText(homeName, marginX + sideW / 2, top - 22, "F2", 11, BLUE);

      centerText("x", midX + midW / 2, top - 19, "F2", 12);

      text("EQUIPE B", rightX + 4, top - 8, "F2", 6.5, GRAY_TEXT);
      centerText(awayName, rightX + sideW / 2, top - 22, "F2", 11, BLUE);

      cursorY = bottom;
    }
    cursorY -= 4;

    // ─── Dados / Contagem / Arbitragem / Horários ───
    drawInfoGrid(match);
    cursorY -= 4;

    // ─── Rosters lado a lado ───
    const gap = 5;
    const halfWidth = (contentWidth - gap) / 2;
    const leftX = marginX;
    const rightX = marginX + halfWidth + gap;

    const rosterTop = cursorY;
    drawRosterTable(leftX, halfWidth, "Equipe A", homeTeam);
    cursorY = rosterTop;
    const rosterHeight = drawRosterTable(rightX, halfWidth, "Equipe B", awayTeam);
    cursorY = rosterTop - rosterHeight;

    // ─── Falta coletiva ───
    const faltaTop = cursorY;
    drawFaltaColetiva(leftX, halfWidth);
    cursorY = faltaTop;
    const faltaHeight = drawFaltaColetiva(rightX, halfWidth);
    cursorY = faltaTop - faltaHeight;

    // ─── 1º tempo / 2º tempo ───
    const tempoTop = cursorY;
    drawTempoRow(leftX, halfWidth);
    cursorY = tempoTop;
    const tempoHeight = drawTempoRow(rightX, halfWidth);
    cursorY = tempoTop - tempoHeight;
    cursorY -= 4;

    // ─── Rodapé: Equipe A / Equipe B + Professor / Capitão ───
    {
      const titleH = 10;
      fillRect(leftX, cursorY - titleH, halfWidth, titleH, 0.12);
      text(`Equipe A - ${homeName}`, leftX + 4, cursorY - titleH + 3, "F2", 7, [1, 1, 1]);
      fillRect(rightX, cursorY - titleH, halfWidth, titleH, 0.12);
      text(`Equipe B - ${awayName}`, rightX + 4, cursorY - titleH + 3, "F2", 7, [1, 1, 1]);
      cursorY -= titleH;

      const fieldsH = 16;
      [leftX, rightX].forEach((sx) => {
        rect(sx, cursorY - fieldsH, halfWidth, fieldsH);
        text("Professor:", sx + 4, cursorY - fieldsH / 2 - 2, "F2", 7);
        line(sx + 48, cursorY - fieldsH / 2 - 4, sx + halfWidth * 0.62, cursorY - fieldsH / 2 - 4);
        text("Capitao:", sx + halfWidth * 0.62 + 6, cursorY - fieldsH / 2 - 2, "F2", 7);
        line(sx + halfWidth * 0.62 + 48, cursorY - fieldsH / 2 - 4, sx + halfWidth - 4, cursorY - fieldsH / 2 - 4);
      });
      cursorY -= fieldsH;
    }
    cursorY -= 4;

    // ─── Observações ───
    const obsHeight = 32;
    rect(marginX, cursorY - obsHeight, contentWidth, obsHeight);
    text("Observacoes / Ocorrencias:", marginX + 4, cursorY - 9, "F2", 7);
    line(marginX + 2, cursorY - 18, marginX + contentWidth - 2, cursorY - 18);
    line(marginX + 2, cursorY - 27, marginX + contentWidth - 2, cursorY - 27);
    cursorY -= obsHeight;
  }

  if (commands.length > 0) pages.push(commands);
  return pages;
}

export function buildMatchSheetsPdf(input: BuildMatchSheetsPdfInput): Buffer {
  const pages = buildMatchSheetPages(input);
  const safePages = pages.length > 0 ? pages : [["0.7 w", "0 0 0 RG", "0 0 0 rg"]];

  const pageWidth = PAGE_WIDTH;
  const pageHeight = PAGE_HEIGHT;

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
