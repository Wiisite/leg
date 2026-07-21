type ModalitySchedulePdfRow = {
  round: number;
  formattedDate: string;
  time: string;
  category: string;
  quadra: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

type BuildModalitySchedulePdfInput = {
  modalityLabel: string;
  monthLabel: string;
  year: number;
  rows: ModalitySchedulePdfRow[];
  generatedAt?: Date;
  titleOverride?: string;
  subtitleOverride?: string;
};

const YELLOW: [number, number, number] = [1, 0.92, 0.15];
const ORANGE: [number, number, number] = [0.97, 0.73, 0.42];
const NAVY: [number, number, number] = [0.06, 0.14, 0.32];

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
  const text = normalizeForPdfText((value || "-").trim() || "-");
  if (text.length <= maxChars) return text;
  const cut = Math.max(1, maxChars - 3);
  return `${text.slice(0, cut).trimEnd()}...`;
}

function quadraLabel(rawLocation: string): string {
  const value = (rawLocation || "").trim();
  if (!value) return "-";
  const stripped = value.replace(/^quadra\s*/i, "").trim();
  return stripped || value;
}

type RowGroup = {
  round: number;
  quadra: string;
  rows: ModalitySchedulePdfRow[];
};

function groupRows(rows: ModalitySchedulePdfRow[]): RowGroup[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;

    const quadraNumA = parseInt(a.quadra.match(/\d+/)?.[0] || "", 10);
    const quadraNumB = parseInt(b.quadra.match(/\d+/)?.[0] || "", 10);
    if (!Number.isNaN(quadraNumA) && !Number.isNaN(quadraNumB) && quadraNumA !== quadraNumB) {
      return quadraNumA - quadraNumB;
    }
    if (a.quadra !== b.quadra) return a.quadra.localeCompare(b.quadra, "pt-BR");

    if (a.time !== b.time) {
      if (a.time === "-") return 1;
      if (b.time === "-") return -1;
      return a.time.localeCompare(b.time);
    }
    return a.category.localeCompare(b.category, "pt-BR");
  });

  const groups: RowGroup[] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.round === row.round && last.quadra === row.quadra) {
      last.rows.push(row);
    } else {
      groups.push({ round: row.round, quadra: row.quadra, rows: [row] });
    }
  }
  return groups;
}

export function buildModalitySchedulePdf(input: BuildModalitySchedulePdfInput): Buffer {
  const { modalityLabel, monthLabel, year, rows, generatedAt = new Date(), titleOverride, subtitleOverride } = input;

  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 20;
  const topMargin = 24;
  const bottomMargin = 20;
  const tableWidth = pageWidth - marginX * 2; // 802

  const columnWidths = [55, 60, 85, 55, 240, 67, 240]; // soma = 802
  const columns = ["Dia", "Horario", "Categoria", "Quadra", "Equipe A", "", "Equipe B"];

  const pages: string[][] = [];
  let commands: string[] = [];
  let cursorY = pageHeight - topMargin;

  const newPage = () => {
    if (commands.length > 0) pages.push(commands);
    commands = ["0.6 w", "0 0 0 RG", "0 0 0 rg"];
    cursorY = pageHeight - topMargin;
  };

  const pushText = (text: string, x: number, y: number, font: "F1" | "F2", size: number, color?: [number, number, number]) => {
    if (color) commands.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    commands.push("BT");
    commands.push(`/${font} ${size} Tf`);
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    commands.push(`(${escapePdfString(text)}) Tj`);
    commands.push("ET");
    if (color) commands.push("0 0 0 rg");
  };

  const estimateWidth = (value: string, font: "F1" | "F2", size: number): number =>
    normalizeForPdfText(value).length * size * (font === "F2" ? 0.58 : 0.5);

  const centerText = (value: string, cx: number, y: number, font: "F1" | "F2", size: number, color?: [number, number, number]) => {
    const w = estimateWidth(value, font, size);
    pushText(value, cx - w / 2, y, font, size, color);
  };

  const fillRect = (x: number, y: number, w: number, h: number, color: [number, number, number]) => {
    commands.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    commands.push("0 0 0 rg");
  };

  const strokeRect = (x: number, y: number, w: number, h: number) => {
    commands.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < bottomMargin) {
      newPage();
    }
  };

  newPage();

  const metadataLines = [
    { text: titleOverride ?? "LEG - Tabelao de Jogos", font: "F2" as const, size: 13 },
    {
      text:
        subtitleOverride ??
        `Modalidade: ${modalityLabel}  |  Referencia: ${monthLabel}/${year}  |  Gerado em: ${generatedLabel}`,
      font: "F1" as const,
      size: 9,
    },
  ];

  for (const line of metadataLines) {
    ensureSpace(14);
    pushText(line.text, marginX, cursorY - 10, line.font, line.size);
    cursorY -= 15;
  }
  cursorY -= 4;

  const groups = groupRows(rows);

  const rowHeight = 16;
  const bannerHeight = 18;
  const headerHeight = 16;

  const drawBanner = (round: number) => {
    fillRect(marginX, cursorY - bannerHeight, tableWidth, bannerHeight, YELLOW);
    strokeRect(marginX, cursorY - bannerHeight, tableWidth, bannerHeight);
    centerText(`${round}a Rodada`, marginX + tableWidth / 2, cursorY - bannerHeight / 2 - 3, "F2", 10, NAVY);
    cursorY -= bannerHeight;
  };

  const drawHeader = () => {
    fillRect(marginX, cursorY - headerHeight, tableWidth, headerHeight, ORANGE);
    let x = marginX;
    for (let i = 0; i < columns.length; i++) {
      const width = columnWidths[i];
      strokeRect(x, cursorY - headerHeight, width, headerHeight);
      if (columns[i]) centerText(columns[i], x + width / 2, cursorY - headerHeight / 2 - 2.5, "F2", 8.5);
      x += width;
    }
    cursorY -= headerHeight;
  };

  if (groups.length === 0) {
    ensureSpace(16);
    pushText("Nenhum jogo cadastrado para o periodo selecionado.", marginX, cursorY - 10, "F1", 10);
  } else {
    for (const group of groups) {
      const groupHeight = bannerHeight + headerHeight + group.rows.length * rowHeight;
      ensureSpace(Math.min(groupHeight, bannerHeight + headerHeight + rowHeight));

      drawBanner(group.round);
      drawHeader();

      for (const row of group.rows) {
        if (cursorY - rowHeight < bottomMargin) {
          newPage();
          drawBanner(group.round);
          drawHeader();
        }

        const isFinished = row.homeScore !== null && row.awayScore !== null;
        const middleValue = isFinished ? `${row.homeScore} x ${row.awayScore}` : "vs";

        const cells = [
          fitCellText(row.formattedDate, 10),
          fitCellText(row.time, 10),
          fitCellText(row.category, 16),
          fitCellText(quadraLabel(row.quadra), 8),
          fitCellText(row.homeTeam, 42),
          middleValue,
          fitCellText(row.awayTeam, 42),
        ];

        const rowBottom = cursorY - rowHeight;
        let x = marginX;
        for (let i = 0; i < cells.length; i++) {
          const width = columnWidths[i];
          strokeRect(x, rowBottom, width, rowHeight);
          if (i === 5) {
            centerText(cells[i], x + width / 2, cursorY - rowHeight / 2 - 2.5, "F2", isFinished ? 9 : 8.5);
          } else if (i === 4 || i === 6) {
            centerText(cells[i], x + width / 2, cursorY - rowHeight / 2 - 2.5, "F1", 9);
          } else {
            centerText(cells[i], x + width / 2, cursorY - rowHeight / 2 - 2.5, "F1", 8.5);
          }
          x += width;
        }
        cursorY = rowBottom;
      }

      cursorY -= 6;
    }
  }

  if (commands.length > 0) pages.push(commands);

  const catalogId = 1;
  const pagesId = 2;
  const regularFontId = 3;
  const boldFontId = 4;

  const objects: Record<number, string> = {};
  const pageObjectIds: number[] = [];
  let nextId = 5;

  for (const pageCommands of pages) {
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
