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

type ContactLike = {
  officialEmail?: string | null;
  phone?: string | null;
  address?: string | null;
};

type BuildVolleyMatchSheetsPdfInput = {
  tournament: TournamentLike;
  teams: TeamLike[];
  matches: MatchLike[];
  athletesByTeam: Record<number, AthleteLike[]>;
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function buildVolleyMatchSheetPages(input: BuildVolleyMatchSheetsPdfInput): string[][] {
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
    commands = ["0.6 w", "0 0 0 RG", "0 0 0 rg"];
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

  // ── Bloco de um SET (2 equipes lado a lado: rodizio + grade de pontos) ──
  const drawSetBlock = (
    x: number,
    width: number,
    height: number,
    setLabel: string,
    homeName: string,
    awayName: string,
    maxPoints: number
  ) => {
    const top = cursorY;

    const titleH = 12;
    fillRect(x, top - titleH, width, titleH, 0.12);
    centerText(setLabel, x + width / 2, top - titleH + 3, "F2", 8, [1, 1, 1]);
    let y = top - titleH;

    const teamRowH = 12;
    const halfW = width / 2;
    rect(x, y - teamRowH, width, teamRowH);
    line(x + halfW, y, x + halfW, y - teamRowH);
    text(`Equipe A: ${fitCellText(homeName, 26)}`, x + 3, y - teamRowH + 3, "F2", 6.5);
    text("Inicio:", x + halfW - 46, y - teamRowH + 3, "F1", 6.5);
    line(x + halfW - 24, y - teamRowH + 2, x + halfW - 3, y - teamRowH + 2);
    text(`Equipe B: ${fitCellText(awayName, 26)}`, x + halfW + 3, y - teamRowH + 3, "F2", 6.5);
    text("Fim:", x + width - 40, y - teamRowH + 3, "F1", 6.5);
    line(x + width - 24, y - teamRowH + 2, x + width - 3, y - teamRowH + 2);
    y -= teamRowH;

    const columnHeight = y - (top - height);
    const rotationH = 32;
    const labelColW = 24;

    [0, 1].forEach((sideIdx) => {
      const colX = x + sideIdx * halfW;
      const dataW = halfW - labelColW;
      const cellW = dataW / 6;

      const rowLabels: [string, string][] = [
        ["Saque", "I|II|III|IV|V|VI"],
        ["Titular", ""],
        ["Sub 1", ""],
        ["Sub 2", ""],
      ];
      const rowH = rotationH / rowLabels.length;

      rowLabels.forEach((_, rIdx) => {
        const rowTop = y - rIdx * rowH;
        rect(colX, rowTop - rowH, labelColW, rowH);
        text(rowLabels[rIdx][0], colX + 2, rowTop - rowH + 2.5, "F2", 5.5);
        for (let c = 0; c < 6; c++) {
          const cellX = colX + labelColW + c * cellW;
          rect(cellX, rowTop - rowH, cellW, rowH);
          if (rIdx === 0) {
            centerText(ROMAN[c], cellX + cellW / 2, rowTop - rowH + 2.5, "F2", 6);
          }
        }
      });

      const belowY = y - rotationH;
      const remainingH = belowY - (top - height);
      const rodizioW = labelColW + 10;
      rect(colX, belowY - remainingH, rodizioW, remainingH);
      centerText("Rodizio", colX + rodizioW / 2, belowY - 8, "F2", 5.5);
      const pairs: [string, string][] = [
        ["1", "5"],
        ["2", "6"],
        ["3", "7"],
        ["4", "8"],
      ];
      const rodizioRowH = (remainingH - 10) / pairs.length;
      pairs.forEach(([a, b], i) => {
        const rowTop = belowY - 10 - i * rodizioRowH;
        centerText(`${a} / ${b}`, colX + rodizioW / 2, rowTop - rodizioRowH + rodizioRowH / 2 - 2, "F1", 6);
      });

      const gridX = colX + rodizioW;
      const gridW = halfW - rodizioW;
      const gridRows = Math.ceil(maxPoints / 3);
      const gridRowH = remainingH / gridRows;
      const gridColW = gridW / 3;

      rect(gridX, belowY - remainingH, gridW, remainingH);
      for (let r = 0; r < gridRows; r++) {
        const rowTop = belowY - r * gridRowH;
        if (r > 0) line(gridX, rowTop, gridX + gridW, rowTop);
        for (let c = 0; c < 3; c++) {
          const value = r + 1 + c * gridRows;
          if (value > maxPoints) continue;
          const cellX = gridX + c * gridColW;
          if (c > 0) line(cellX, rowTop, cellX, rowTop - gridRowH);
          centerText(String(value), cellX + gridColW / 2, rowTop - gridRowH + gridRowH / 2 - 2, "F1", 6.5, GRAY_TEXT);
        }
      }
    });

    line(x + halfW, y, x + halfW, top - height);
  };

  // ── Lista de elenco (Nº + Nome) de uma equipe ──
  const drawRosterList = (x: number, width: number, height: number, label: string, team: TeamLike | undefined) => {
    const teamName = team?.name || "A definir";
    const roster = team ? athletesByTeam[team.id] || [] : [];

    const titleH = 10;
    fillRect(x, cursorY - titleH, width, titleH, 0.12);
    text(fitCellText(`${label} - ${teamName.toUpperCase()}`, 48), x + 3, cursorY - titleH + 3, "F2", 6.5, [1, 1, 1]);

    const headerH = 9;
    const headerTop = cursorY - titleH;
    fillRect(x, headerTop - headerH, width, headerH, 0.85);
    const numW = 22;
    rect(x, headerTop - headerH, numW, headerH);
    rect(x + numW, headerTop - headerH, width - numW, headerH);
    text("No", x + 3, headerTop - headerH + 2.3, "F2", 5.5);
    text("Nome", x + numW + 3, headerTop - headerH + 2.3, "F2", 5.5);

    const rowsAvailable = Math.max(1, Math.floor((height - titleH - headerH) / 8.5));
    const rowH = (height - titleH - headerH) / rowsAvailable;
    let rowTop = headerTop - headerH;
    for (let i = 0; i < rowsAvailable; i++) {
      const athlete = roster[i];
      rect(x, rowTop - rowH, numW, rowH);
      rect(x + numW, rowTop - rowH, width - numW, rowH);
      if (athlete) {
        if (athlete.number != null) {
          text(String(athlete.number), x + 4, rowTop - rowH + 2.3, "F1", 6);
        }
        const maxChars = Math.floor((width - numW - 4) / (6 * 0.5));
        text(fitCellText(athlete.name, maxChars), x + numW + 3, rowTop - rowH + 2.3, "F1", 6);
      }
      rowTop -= rowH;
    }
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

    // ─── Cabecalho / marca ───
    centerText("LEG - Sumula Oficial de Voleibol", marginX + contentWidth / 2, cursorY - 9, "F2", 11);
    cursorY -= 12;
    centerText(tournament.name.toUpperCase(), marginX + contentWidth / 2, cursorY - 8, "F2", 9);
    cursorY -= 10;
    const contactParts = [contact?.officialEmail, contact?.phone, contact?.address]
      .map((v) => (v || "").trim())
      .filter(Boolean);
    if (contactParts.length > 0) {
      centerText(contactParts.join("  /  "), marginX + contentWidth / 2, cursorY - 6, "F1", 6.5, GRAY_TEXT);
      cursorY -= 9;
    }
    cursorY -= 4;

    // ─── Equipe A x Equipe B ───
    {
      const boxH = 24;
      const midW = 26;
      const sideW = (contentWidth - midW) / 2;
      const top = cursorY;
      const bottom = top - boxH;
      const midX = marginX + sideW;
      const rightX = midX + midW;

      rect(marginX, bottom, contentWidth, boxH);
      line(midX, top, midX, bottom);
      line(rightX, top, rightX, bottom);

      text("EQUIPE A", marginX + 4, top - 7, "F2", 6, GRAY_TEXT);
      centerText(homeName, marginX + sideW / 2, top - 18, "F2", 9.5, BLUE);

      centerText("x", midX + midW / 2, top - 15, "F2", 11);

      text("EQUIPE B", rightX + 4, top - 7, "F2", 6, GRAY_TEXT);
      centerText(awayName, rightX + sideW / 2, top - 18, "F2", 9.5, BLUE);

      cursorY = bottom;
    }
    cursorY -= 4;

    // ─── Linha de metadados (Cidade / Categoria / Ginasio / Jogo No / Data / Horario) ───
    {
      const rowH = 14;
      const fields: [string, string][] = [
        ["Cidade", ""],
        ["Categoria", tournament.category],
        ["Ginasio", (match.location || "").trim()],
        ["Jogo No", String(match.id)],
        ["Data", formatDate(match.date)],
        ["Horario", (match.time || "").trim()],
      ];
      const colW = contentWidth / fields.length;
      rect(marginX, cursorY - rowH, contentWidth, rowH);
      fields.forEach(([label, value], i) => {
        const colX = marginX + i * colW;
        if (i > 0) line(colX, cursorY, colX, cursorY - rowH);
        text(`${label}:`, colX + 3, cursorY - rowH / 2 - 2, "F2", 6);
        const labelW = estimateWidth(`${label}: `, "F2", 6);
        text(fitCellText(value, 16), colX + 3 + labelW, cursorY - rowH / 2 - 2, "F1", 6.5);
      });
      cursorY -= rowH;
    }
    cursorY -= 4;

    // ─── Sets 1 e 2 lado a lado ───
    const gap = 6;
    const halfWidth = (contentWidth - gap) / 2;
    const setsTopHeight = 300;

    const setsTop = cursorY;
    drawSetBlock(marginX, halfWidth, setsTopHeight, "1o SET", homeName, awayName, 27);
    cursorY = setsTop;
    drawSetBlock(marginX + halfWidth + gap, halfWidth, setsTopHeight, "2o SET", homeName, awayName, 27);
    cursorY = setsTop - setsTopHeight;
    cursorY -= 4;

    // ─── Set 3 (tie-break) + Elenco / Assinaturas ───
    const bottomRowHeight = 175;
    const bottomTop = cursorY;

    drawSetBlock(marginX, halfWidth, bottomRowHeight, "3o SET (tie-break)", homeName, awayName, 21);
    cursorY = bottomTop;

    // Painel direito: elenco A / B + resultado + assinaturas
    const panelX = marginX + halfWidth + gap;
    const rosterHeight = 90;
    const rosterGap = 4;
    const rosterColW = (halfWidth - rosterGap) / 2;
    drawRosterList(panelX, rosterColW, rosterHeight, "Elenco A", homeTeam);
    drawRosterList(panelX + rosterColW + rosterGap, rosterColW, rosterHeight, "Elenco B", awayTeam);
    cursorY = bottomTop - rosterHeight;
    cursorY -= 3;

    {
      const resultH = 46;
      const rowLabels = ["1o Set", "2o Set", "3o Set", "Total"];
      const labelW = 42;
      const colW = (halfWidth - labelW) / 2;
      const titleRowH = 9;

      fillRect(panelX, cursorY - titleRowH, halfWidth, titleRowH, 0.12);
      text("RESULTADO", panelX + 3, cursorY - titleRowH + 2.5, "F2", 6, [1, 1, 1]);
      centerText("Equipe A", panelX + labelW + colW / 2, cursorY - titleRowH + 2.5, "F2", 6, [1, 1, 1]);
      centerText("Equipe B", panelX + labelW + colW + colW / 2, cursorY - titleRowH + 2.5, "F2", 6, [1, 1, 1]);

      const rowH = (resultH - titleRowH) / rowLabels.length;
      let rowTop = cursorY - titleRowH;
      rowLabels.forEach((label) => {
        rect(panelX, rowTop - rowH, labelW, rowH);
        rect(panelX + labelW, rowTop - rowH, colW, rowH);
        rect(panelX + labelW + colW, rowTop - rowH, colW, rowH);
        text(label, panelX + 3, rowTop - rowH + 2.5, "F1", 6);
        rowTop -= rowH;
      });
      cursorY -= resultH;
    }
    cursorY -= 3;

    {
      const signH = 33;
      const rowH = signH / 3;
      const capW = halfWidth / 2;
      const top = cursorY;
      rect(panelX, top - signH, halfWidth, signH);
      line(panelX, top - rowH, panelX + halfWidth, top - rowH);
      line(panelX, top - rowH * 2, panelX + halfWidth, top - rowH * 2);

      const row0Y = top - rowH + 3;
      text("Vencedor:", panelX + 4, row0Y, "F2", 6.5);
      line(panelX + 42, row0Y - 1.5, panelX + halfWidth - 4, row0Y - 1.5);

      const row1Y = top - rowH * 2 + 3;
      text("Capitao A:", panelX + 4, row1Y, "F2", 6.5);
      line(panelX + 44, row1Y - 1.5, panelX + capW - 4, row1Y - 1.5);
      text("Capitao B:", panelX + capW + 4, row1Y, "F2", 6.5);
      line(panelX + capW + 44, row1Y - 1.5, panelX + halfWidth - 4, row1Y - 1.5);

      const row2Y = top - signH + 3;
      text("Arbitro:", panelX + 4, row2Y, "F2", 6.5);
      line(panelX + 36, row2Y - 1.5, panelX + capW - 4, row2Y - 1.5);
      text("Anotador:", panelX + capW + 4, row2Y, "F2", 6.5);
      line(panelX + capW + 42, row2Y - 1.5, panelX + halfWidth - 4, row2Y - 1.5);

      cursorY -= signH;
    }
  }

  if (commands.length > 0) pages.push(commands);
  return pages;
}

export function buildVolleyMatchSheetsPdf(input: BuildVolleyMatchSheetsPdfInput): Buffer {
  const pages = buildVolleyMatchSheetPages(input);
  const safePages = pages.length > 0 ? pages : [["0.6 w", "0 0 0 RG", "0 0 0 rg"]];

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
