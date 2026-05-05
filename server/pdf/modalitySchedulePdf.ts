type ModalitySchedulePdfRow = {
  formattedDate: string;
  time: string;
  category: string;
  homeTeam: string;
  awayTeam: string;
  location: string;
};

type BuildModalitySchedulePdfInput = {
  modalityLabel: string;
  monthLabel: string;
  year: number;
  rows: ModalitySchedulePdfRow[];
  generatedAt?: Date;
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
  const text = normalizeForPdfText((value || "-").trim() || "-");
  if (text.length <= maxChars) return text;
  const cut = Math.max(1, maxChars - 3);
  return `${text.slice(0, cut).trimEnd()}...`;
}

function wrapCellText(value: string, maxCharsPerLine: number): string[] {
  const text = normalizeForPdfText((value || "-").trim() || "-");
  if (text.length <= maxCharsPerLine) return [text];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  const pushLine = () => {
    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trim());
      currentLine = "";
    }
  };

  for (const word of words) {
    if (!word) continue;

    if (word.length > maxCharsPerLine) {
      pushLine();
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      continue;
    }

    const candidate = currentLine.length === 0 ? word : `${currentLine} ${word}`;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      pushLine();
      currentLine = word;
    }
  }

  pushLine();
  return lines.length > 0 ? lines : ["-"];
}

export function buildModalitySchedulePdf(input: BuildModalitySchedulePdfInput): Buffer {
  const { modalityLabel, monthLabel, year, rows, generatedAt = new Date() } = input;

  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 30;
  const topMargin = 28;
  const bottomMargin = 28;
  const tableWidth = pageWidth - marginX * 2;
  const columnWidths = [50, 55, 80, 120, 120, 110];
  const columns = ["Data", "Horario", "Categoria", "Equipe A", "Equipe B", "Endereco"];

  const pages: string[][] = [];
  let commands: string[] = [];
  let cursorY = pageHeight - topMargin;

  const newPage = () => {
    if (commands.length > 0) pages.push(commands);
    commands = ["0.6 w", "0 0 0 RG", "0 0 0 rg"];
    cursorY = pageHeight - topMargin;
  };

  const pushText = (text: string, x: number, y: number, font: "F1" | "F2", size: number) => {
    commands.push("BT");
    commands.push(`/${font} ${size} Tf`);
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
    commands.push(`(${escapePdfString(text)}) Tj`);
    commands.push("ET");
  };

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < bottomMargin) {
      newPage();
    }
  };

  const drawHeader = () => {
    const headerBottom = cursorY - 18;
    let x = marginX;
    for (let i = 0; i < columns.length; i++) {
      const width = columnWidths[i];
      commands.push(`${x} ${headerBottom.toFixed(2)} ${width} 18 re S`);
      pushText(columns[i], x + 3, cursorY - 12, "F2", 8);
      x += width;
    }
    cursorY = headerBottom;
  };

  newPage();

  const metadataLines = [
    { text: "LEG - Tabelao da Modalidade", font: "F2" as const, size: 13 },
    { text: `Modalidade: ${modalityLabel}`, font: "F2" as const, size: 10 },
    { text: `Referencia: ${monthLabel}/${year}`, font: "F1" as const, size: 10 },
    { text: `Gerado em: ${generatedLabel}`, font: "F1" as const, size: 10 },
  ];

  for (const line of metadataLines) {
    ensureSpace(14);
    pushText(line.text, marginX, cursorY - 10, line.font, line.size);
    cursorY -= 14;
  }

  cursorY -= 8;

  if (rows.length === 0) {
    ensureSpace(16);
    pushText("Nenhum jogo cadastrado para o periodo selecionado.", marginX, cursorY - 10, "F1", 10);
  } else {
    drawHeader();

    for (const row of rows) {
      const locationLines = wrapCellText(row.location, 26);
      const lineHeight = 9;
      const topPadding = 3;
      const bottomPadding = 4;
      const rowHeight = Math.max(16, topPadding + bottomPadding + locationLines.length * lineHeight);

      if (cursorY - rowHeight < bottomMargin) {
        newPage();
        drawHeader();
      }

      const cells = [
        fitCellText(row.formattedDate, 10),
        fitCellText(row.time, 10),
        fitCellText(row.category, 18),
        fitCellText(row.homeTeam, 24),
        fitCellText(row.awayTeam, 24),
        "",
      ];

      const rowBottom = cursorY - rowHeight;
      let x = marginX;
      for (let i = 0; i < cells.length; i++) {
        const width = columnWidths[i];
        commands.push(`${x} ${rowBottom.toFixed(2)} ${width} ${rowHeight} re S`);
        if (i === 5) {
          for (let lineIndex = 0; lineIndex < locationLines.length; lineIndex++) {
            const textY = cursorY - 11 - lineIndex * lineHeight;
            pushText(locationLines[lineIndex], x + 3, textY, "F1", 8);
          }
        } else {
          pushText(cells[i], x + 3, cursorY - 11, "F1", 8);
        }
        x += width;
      }

      cursorY = rowBottom;
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
