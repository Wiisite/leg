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
const GRAY_TEXT: RGB = [0.4, 0.4, 0.4];

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
  const marginX = 8;
  const topMargin = 8;
  const contentWidth = pageWidth - marginX * 2; // 826

  const pages: string[][] = [];
  let commands: string[] = [];
  let cursorY = pageHeight - topMargin;

  const startPage = () => {
    if (commands.length > 0) pages.push(commands);
    commands = ["0.5 w", "0 0 0 RG", "0 0 0 rg"];
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

  // ── Coluna estreita "Inicio/Fim" + "PONTOS" (grade numerada 1..maxPoints) ──
  const drawPontosCol = (x: number, top: number, width: number, height: number, timeLabel: string, maxPoints: number) => {
    const timeH = height * 0.12;
    rect(x, top - timeH, width, timeH);
    text(`${timeLabel}:`, x + 1.5, top - timeH + 2, "F1", 4.8);

    const gridTop = top - timeH;
    const gridH = height - timeH;
    const rows = Math.ceil(maxPoints / 3);
    const rowH = gridH / rows;
    const colW = width / 3;
    rect(x, gridTop - gridH, width, gridH);
    for (let r = 0; r < rows; r++) {
      const rowTop = gridTop - r * rowH;
      if (r > 0) line(x, rowTop, x + width, rowTop);
      for (let c = 0; c < 3; c++) {
        const cellX = x + c * colW;
        if (c > 0) line(cellX, rowTop, cellX, rowTop - rowH);
        const value = r + 1 + c * rows;
        if (value <= maxPoints) {
          centerText(String(value), cellX + colW / 2, rowTop - rowH / 2 - 1.6, "F1", 4.6, GRAY_TEXT);
        }
      }
    }
  };

  // ── Grupo de uma equipe: cabecalho (nome+S+R) + colunas I..VI + grade larga ──
  const drawTeamGroup = (
    x: number,
    top: number,
    width: number,
    headerH: number,
    rotationRowsH: number,
    wideGridRowsCount: number,
    wideGridH: number,
    teamLabel: string,
    teamName: string,
    withLabelCol: boolean,
    labelColW: number
  ) => {
    const srW = width * 0.09;
    const nameW = width - srW * 2;

    rect(x, top - headerH, nameW, headerH);
    text(teamLabel, x + 1.5, top - headerH * 0.45, "F2", 5.2);
    centerText(fitCellText(teamName, 22), x + nameW / 2, top - headerH + 2, "F1", 5, GRAY_TEXT);
    rect(x + nameW, top - headerH, srW, headerH);
    centerText("S", x + nameW + srW / 2, top - headerH * 0.45, "F2", 5.2);
    rect(x + nameW + srW, top - headerH, srW, headerH);
    centerText("R", x + nameW + srW * 1.5, top - headerH * 0.45, "F2", 5.2);

    const bodyTop = top - headerH;
    const dataW = width - labelColW;
    const cellW = dataW / 6;

    if (withLabelCol) {
      rect(x, bodyTop - rotationRowsH, labelColW, rotationRowsH);
    }

    const rowLabels = ["ordem de saque", "jogadores iniciantes", "SUBS no jogador", ""];
    const rowH = rotationRowsH / rowLabels.length;
    rowLabels.forEach((label, rIdx) => {
      const rowTop = bodyTop - rIdx * rowH;
      if (withLabelCol && label) {
        text(fitCellText(label, 22), x + 1.5, rowTop - rowH + rowH / 2 - 1.5, "F1", 4.6);
      }
      for (let c = 0; c < 6; c++) {
        const cellX = x + labelColW + c * cellW;
        rect(cellX, rowTop - rowH, cellW, rowH);
        if (rIdx === 0) {
          centerText(ROMAN[c], cellX + cellW / 2, rowTop - rowH + rowH / 2 - 1.8, "F2", 5.5);
        }
      }
      if (rIdx > 0) line(x, rowTop, x + width, rowTop);
    });

    const gridTop = bodyTop - rotationRowsH;
    if (withLabelCol) {
      const rodizioH = wideGridH / wideGridRowsCount;
      rect(x, gridTop - wideGridH, labelColW, wideGridH);
      centerText("RODIZIO", x + labelColW / 2, gridTop - rodizioH * 0.65 - 1.5, "F2", 4.6);
      centerText("SAQUE", x + labelColW / 2, gridTop - rodizioH * 1.65 - 1.5, "F2", 4.6);
      const pairs = ["1 / 5", "2 / 6", "3 / 7", "4 / 8"];
      pairs.forEach((pairLabel, i) => {
        if (i + 2 >= wideGridRowsCount) return;
        const rowTop = gridTop - (i + 2) * rodizioH;
        centerText(pairLabel, x + labelColW / 2, rowTop - rodizioH / 2 - 1.6, "F1", 4.8);
      });
    }

    const wideX = x + labelColW;
    const wideW = width - labelColW;
    const subColW = wideW / 12;
    const wideRowH = wideGridH / wideGridRowsCount;
    rect(wideX, gridTop - wideGridH, wideW, wideGridH);
    for (let r = 1; r < wideGridRowsCount; r++) {
      line(wideX, gridTop - r * wideRowH, wideX + wideW, gridTop - r * wideRowH);
    }
    for (let c = 1; c < 12; c++) {
      line(wideX + c * subColW, gridTop, wideX + c * subColW, gridTop - wideGridH);
    }
  };

  // ── Um bloco de SET completo (2 equipes) ──
  const drawSetBlock = (
    x: number,
    top: number,
    width: number,
    setLabel: string,
    leftName: string,
    leftLabel: string,
    rightName: string,
    rightLabel: string,
    maxPoints: number,
    wideGridRowsCount: number
  ) => {
    const titleH = 9;
    fillRect(x, top - titleH, width, titleH, 0.15);
    centerText(setLabel, x + width / 2, top - titleH + 2.3, "F2", 7, [1, 1, 1]);

    const headerH = 16;
    const pontosW = width * 0.065;
    const teamZoneW = (width - pontosW * 2) / 2;

    const bodyTop = top - titleH;
    const rotationRowsH = 56;
    const wideGridH = 106;
    const groupHeight = headerH + rotationRowsH + wideGridH;

    drawTeamGroup(
      x,
      bodyTop,
      teamZoneW,
      headerH,
      rotationRowsH,
      wideGridRowsCount,
      wideGridH,
      leftLabel,
      leftName,
      true,
      teamZoneW * 0.32
    );
    drawPontosCol(x + teamZoneW, bodyTop, pontosW, groupHeight, "Inicio", maxPoints);
    drawTeamGroup(
      x + teamZoneW + pontosW,
      bodyTop,
      teamZoneW,
      headerH,
      rotationRowsH,
      wideGridRowsCount,
      wideGridH,
      rightLabel,
      rightName,
      false,
      0
    );
    drawPontosCol(x + teamZoneW * 2 + pontosW, bodyTop, pontosW, groupHeight, "Fim", maxPoints);

    return titleH + groupHeight;
  };

  // ── Lista de elenco (No + Nome) de uma equipe ──
  const drawRosterList = (x: number, top: number, width: number, height: number, label: string, team: TeamLike | undefined) => {
    const teamName = team?.name || "A definir";
    const roster = team ? athletesByTeam[team.id] || [] : [];

    const titleH = 9;
    fillRect(x, top - titleH, width, titleH, 0.15);
    text(fitCellText(`${label} - ${teamName.toUpperCase()}`, 46), x + 3, top - titleH + 2.3, "F2", 6, [1, 1, 1]);

    const headerH = 8;
    const headerTop = top - titleH;
    fillRect(x, headerTop - headerH, width, headerH, 0.85);
    const numW = 20;
    rect(x, headerTop - headerH, numW, headerH);
    rect(x + numW, headerTop - headerH, width - numW, headerH);
    text("No", x + 3, headerTop - headerH + 2, "F2", 5.2);
    text("Nome", x + numW + 3, headerTop - headerH + 2, "F2", 5.2);

    const rowsAvailable = Math.max(1, Math.floor((height - titleH - headerH) / 8));
    const rowH = (height - titleH - headerH) / rowsAvailable;
    let rowTop = headerTop - headerH;
    for (let i = 0; i < rowsAvailable; i++) {
      const athlete = roster[i];
      rect(x, rowTop - rowH, numW, rowH);
      rect(x + numW, rowTop - rowH, width - numW, rowH);
      if (athlete) {
        if (athlete.number != null) {
          text(String(athlete.number), x + 4, rowTop - rowH + 2, "F1", 5.5);
        }
        const maxChars = Math.floor((width - numW - 4) / (5.5 * 0.5));
        text(fitCellText(athlete.name, maxChars), x + numW + 3, rowTop - rowH + 2, "F1", 5.5);
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

    // ─── Linha 1: Competicao / Data / Horario ───
    {
      const rowH = 11;
      const fields: [string, string, number][] = [
        ["Competicao", tournament.name, 0.62],
        ["Data", formatDate(match.date), 0.19],
        ["Horario", (match.time || "").trim(), 0.19],
      ];
      let colX = marginX;
      rect(marginX, cursorY - rowH, contentWidth, rowH);
      fields.forEach(([label, value, frac], i) => {
        const colW = contentWidth * frac;
        if (i > 0) line(colX, cursorY, colX, cursorY - rowH);
        text(`${label}:`, colX + 3, cursorY - rowH / 2 - 2, "F2", 6.5);
        const labelW = estimateWidth(`${label}: `, "F2", 6.5);
        text(fitCellText(value, 60), colX + 3 + labelW, cursorY - rowH / 2 - 2, "F1", 6.5);
        colX += colW;
      });
      cursorY -= rowH;
    }

    // ─── Linha 2: Cidade / Categoria / Divisao / Jogo n. ───
    {
      const rowH = 11;
      const fields: [string, string, number][] = [
        ["Cidade", "", 0.28],
        ["Categoria", tournament.category, 0.28],
        ["Divisao", "", 0.22],
        ["Jogo no", String(match.id), 0.22],
      ];
      let colX = marginX;
      rect(marginX, cursorY - rowH, contentWidth, rowH);
      fields.forEach(([label, value, frac], i) => {
        const colW = contentWidth * frac;
        if (i > 0) line(colX, cursorY, colX, cursorY - rowH);
        text(`${label}:`, colX + 3, cursorY - rowH / 2 - 2, "F2", 6.5);
        const labelW = estimateWidth(`${label}: `, "F2", 6.5);
        text(fitCellText(value, 40), colX + 3 + labelW, cursorY - rowH / 2 - 2, "F1", 6.5);
        colX += colW;
      });
      cursorY -= rowH;
    }

    // ─── Linha 3: Ginasio / Equipe(A ou B) + marca LEG ───
    {
      const rowH = 22;
      const leftW = contentWidth * 0.5;
      rect(marginX, cursorY - rowH, leftW, rowH);

      text("Ginasio:", marginX + 3, cursorY - 8, "F2", 6.5);
      text(fitCellText((match.location || "").trim(), 40), marginX + 42, cursorY - 8, "F1", 6.5);

      centerText("EQUIPE A x EQUIPE B", marginX + leftW / 2, cursorY - 18, "F2", 7);

      rect(marginX + leftW, cursorY - rowH, contentWidth - leftW, rowH);
      centerText("LEG - Sumula Oficial de Voleibol", marginX + leftW + (contentWidth - leftW) / 2, cursorY - 9, "F2", 9.5);
      const contactParts = [contact?.officialEmail, contact?.phone, contact?.address]
        .map((v) => (v || "").trim())
        .filter(Boolean);
      const contactLine = contactParts.length > 0 ? contactParts.join("  /  ") : "www.leg.com.br";
      centerText(contactLine, marginX + leftW + (contentWidth - leftW) / 2, cursorY - 18, "F1", 6, GRAY_TEXT);

      cursorY -= rowH;
    }

    // ─── Linha 4: sexo / (Equipe A) vs (Equipe B) ───
    {
      const rowH = 11;
      rect(marginX, cursorY - rowH, contentWidth, rowH);
      text("Sexo:  masc ( )   fem ( )", marginX + 3, cursorY - rowH / 2 - 2, "F1", 6.5);
      const midX = marginX + contentWidth * 0.28;
      const vsCx = marginX + contentWidth * 0.5;
      const rightX = marginX + contentWidth * 0.72;
      line(midX, cursorY, midX, cursorY - rowH);
      line(vsCx - contentWidth * 0.22, cursorY, vsCx - contentWidth * 0.22, cursorY - rowH);
      line(vsCx + contentWidth * 0.22, cursorY, vsCx + contentWidth * 0.22, cursorY - rowH);
      centerText(`(${fitCellText(homeName, 26)})`, (midX + vsCx - contentWidth * 0.22) / 2, cursorY - rowH / 2 - 2, "F2", 6.5);
      centerText("vs", vsCx, cursorY - rowH / 2 - 2, "F2", 7);
      centerText(`(${fitCellText(awayName, 26)})`, (vsCx + contentWidth * 0.22 + rightX) / 2, cursorY - rowH / 2 - 2, "F2", 6.5);
      cursorY -= rowH;
    }
    cursorY -= 3;

    // ─── Set 1 e Set 2 lado a lado ───
    const gap = 5;
    const halfWidth = (contentWidth - gap) / 2;
    const setsTop = cursorY;
    drawSetBlock(marginX, setsTop, halfWidth, "1o SET", homeName, "EQUIPE (A)", awayName, "EQUIPE (B)", 27, 6);
    const usedHeight = drawSetBlock(
      marginX + halfWidth + gap,
      setsTop,
      halfWidth,
      "2o SET",
      awayName,
      "EQUIPE (B)",
      homeName,
      "EQUIPE (A)",
      27,
      6
    );
    cursorY = setsTop - usedHeight;
    cursorY -= 4;

    // ─── Set 3 (tie-break) a esquerda, painel a direita ───
    const bottomTop = cursorY;
    const set3Height = drawSetBlock(
      marginX,
      bottomTop,
      halfWidth,
      "3o SET (tie-break)",
      homeName,
      "EQUIPE (A)",
      awayName,
      "EQUIPE (B)",
      21,
      4
    );

    const bottomRowHeight = 320;
    const panelX = marginX + halfWidth + gap;

    // Painel direito: elenco A / B
    const rosterHeight = 155;
    const rosterGap = 4;
    const rosterColW = (halfWidth - rosterGap) / 2;
    drawRosterList(panelX, bottomTop, rosterColW, rosterHeight, "Elenco A", homeTeam);
    drawRosterList(panelX + rosterColW + rosterGap, bottomTop, rosterColW, rosterHeight, "Elenco B", awayTeam);

    // Resultado
    {
      const resultTop = bottomTop - rosterHeight - 4;
      const resultH = 78;
      const rowLabels = ["I SET", "II SET", "III SET", "TOTAL"];
      const labelW = 42;
      const colW = (halfWidth - labelW) / 2;
      const titleRowH = 9;

      fillRect(panelX, resultTop - titleRowH, halfWidth, titleRowH, 0.15);
      text("RESULTADO", panelX + 3, resultTop - titleRowH + 2.3, "F2", 6, [1, 1, 1]);
      centerText("Equipe A", panelX + labelW + colW / 2, resultTop - titleRowH + 2.3, "F2", 6, [1, 1, 1]);
      centerText("Equipe B", panelX + labelW + colW + colW / 2, resultTop - titleRowH + 2.3, "F2", 6, [1, 1, 1]);

      const rowH = (resultH - titleRowH) / rowLabels.length;
      let rowTop = resultTop - titleRowH;
      rowLabels.forEach((label) => {
        rect(panelX, rowTop - rowH, labelW, rowH);
        rect(panelX + labelW, rowTop - rowH, colW, rowH);
        rect(panelX + labelW + colW, rowTop - rowH, colW, rowH);
        text(label, panelX + 3, rowTop - rowH + 2, "F1", 6);
        rowTop -= rowH;
      });

      // Assinaturas
      const signTop = resultTop - resultH - 4;
      const signH = 54;
      const rowSH = signH / 3;
      const capW = halfWidth / 2;

      rect(panelX, signTop - signH, halfWidth, signH);
      line(panelX, signTop - rowSH, panelX + halfWidth, signTop - rowSH);
      line(panelX, signTop - rowSH * 2, panelX + halfWidth, signTop - rowSH * 2);

      const r0Y = signTop - rowSH + 3;
      text("Vencedor:", panelX + 4, r0Y, "F2", 6.5);
      line(panelX + 42, r0Y - 1.5, panelX + halfWidth - 4, r0Y - 1.5);

      const r1Y = signTop - rowSH * 2 + 3;
      text("Capitao A:", panelX + 4, r1Y, "F2", 6.5);
      line(panelX + 44, r1Y - 1.5, panelX + capW - 4, r1Y - 1.5);
      text("Capitao B:", panelX + capW + 4, r1Y, "F2", 6.5);
      line(panelX + capW + 44, r1Y - 1.5, panelX + halfWidth - 4, r1Y - 1.5);

      const r2Y = signTop - signH + 3;
      text("Arbitro:", panelX + 4, r2Y, "F2", 6.5);
      line(panelX + 36, r2Y - 1.5, panelX + capW - 4, r2Y - 1.5);
      text("Anotador:", panelX + capW + 4, r2Y, "F2", 6.5);
      line(panelX + capW + 42, r2Y - 1.5, panelX + halfWidth - 4, r2Y - 1.5);
    }

    // ─── Penalidades + Observacoes (abaixo do Set 3) ───
    {
      const penTop = bottomTop - set3Height - 4;
      const penH = bottomRowHeight - set3Height - 4;
      const penColW = halfWidth * 0.16;
      const obsW = halfWidth - penColW;

      const penTitleH = 8;
      fillRect(marginX, penTop - penTitleH, penColW, penTitleH, 0.15);
      text("PENAL.", marginX + 2, penTop - penTitleH + 2, "F2", 5, [1, 1, 1]);
      fillRect(marginX + penColW, penTop - penTitleH, obsW, penTitleH, 0.15);
      text("Observacoes / Ocorrencias:", marginX + penColW + 3, penTop - penTitleH + 2, "F2", 5.5, [1, 1, 1]);

      const bodyH = penH - penTitleH;
      const penCols = ["A", "P", "E", "D", "EQ", "S"];
      const penSubColW = penColW / penCols.length;
      penCols.forEach((label, i) => {
        const cx = marginX + i * penSubColW;
        rect(cx, penTop - penTitleH - bodyH, penSubColW, bodyH);
        centerText(label, cx + penSubColW / 2, penTop - penTitleH - 6, "F2", 5);
      });
      rect(marginX + penColW, penTop - penTitleH - bodyH, obsW, bodyH);

      const obsLines = 6;
      const obsLineH = bodyH / obsLines;
      for (let i = 1; i < obsLines; i++) {
        line(
          marginX + penColW + 4,
          penTop - penTitleH - i * obsLineH + 3,
          marginX + halfWidth - 4,
          penTop - penTitleH - i * obsLineH + 3
        );
      }
    }

    cursorY = bottomTop - bottomRowHeight;
  }

  if (commands.length > 0) pages.push(commands);
  return pages;
}

export function buildVolleyMatchSheetsPdf(input: BuildVolleyMatchSheetsPdfInput): Buffer {
  const pages = buildVolleyMatchSheetPages(input);
  const safePages = pages.length > 0 ? pages : [["0.5 w", "0 0 0 RG", "0 0 0 rg"]];

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
