type StandingEntryLike = {
  teamId: number;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  setsWon?: number;
  setsLost?: number;
};

type StandingsGroup = {
  groupName: string | null;
  standings: StandingEntryLike[];
};

type BuildStandingsPdfInput = {
  tournamentName: string;
  category: string;
  modality: string;
  groups: StandingsGroup[];
  generatedAt?: Date;
};

const MODALITY_LABELS: Record<string, string> = {
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Voleibol",
  handebol: "Handebol",
};

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

export function buildStandingsPdf(input: BuildStandingsPdfInput): Buffer {
  const { tournamentName, category, modality, groups, generatedAt = new Date() } = input;

  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isVolei = modality === "volei";
  const modalityLabel = MODALITY_LABELS[String(modality || "").toLowerCase()] ?? modality;

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 30;
  const topMargin = 28;
  const bottomMargin = 28;
  const tableWidth = pageWidth - marginX * 2;

  const columns = isVolei
    ? ["Pos", "Equipe", "PJ", "V", "D", "Sets V", "Sets D", "Pts"]
    : ["Pos", "Equipe", "PJ", "V", "E", "D", "GP", "GC", "SG", "Pts"];
  const columnWidths = isVolei
    ? [28, 269, 34, 34, 34, 48, 48, 40] // soma = 535 (tableWidth)
    : [26, 245, 34, 30, 30, 30, 34, 34, 34, 38]; // soma = 535 (tableWidth)

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

  const estimateWidth = (value: string, font: "F1" | "F2", size: number): number =>
    normalizeForPdfText(value).length * size * (font === "F2" ? 0.58 : 0.5);

  const centerText = (value: string, cx: number, y: number, font: "F1" | "F2", size: number) => {
    const w = estimateWidth(value, font, size);
    pushText(value, cx - w / 2, y, font, size);
  };

  const fillRect = (x: number, y: number, w: number, h: number, gray: number) => {
    commands.push(`${gray} ${gray} ${gray} rg`);
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
    { text: "LEG - Classificacao do Campeonato", font: "F2" as const, size: 13 },
    { text: `Campeonato: ${tournamentName}`, font: "F2" as const, size: 10 },
    { text: `Categoria: ${category}  |  Modalidade: ${modalityLabel}`, font: "F1" as const, size: 10 },
    { text: `Gerado em: ${generatedLabel}`, font: "F1" as const, size: 10 },
  ];

  for (const line of metadataLines) {
    ensureSpace(14);
    pushText(line.text, marginX, cursorY - 10, line.font, line.size);
    cursorY -= 14;
  }
  cursorY -= 8;

  const rowHeight = 18;
  const headerHeight = 18;

  const drawHeader = () => {
    fillRect(marginX, cursorY - headerHeight, tableWidth, headerHeight, 0.88);
    let x = marginX;
    for (let i = 0; i < columns.length; i++) {
      const width = columnWidths[i];
      strokeRect(x, cursorY - headerHeight, width, headerHeight);
      centerText(columns[i], x + width / 2, cursorY - headerHeight / 2 - 3, "F2", 8.5);
      x += width;
    }
    cursorY -= headerHeight;
  };

  if (groups.length === 0 || groups.every((g) => g.standings.length === 0)) {
    ensureSpace(16);
    pushText("Nenhuma partida finalizada para gerar a classificacao.", marginX, cursorY - 10, "F1", 10);
  } else {
    for (const group of groups) {
      if (group.standings.length === 0) continue;

      ensureSpace(headerHeight + rowHeight + (group.groupName ? 18 : 0));

      if (group.groupName) {
        pushText(`Grupo ${group.groupName}`, marginX, cursorY - 10, "F2", 10.5);
        cursorY -= 18;
      }

      drawHeader();

      group.standings.forEach((entry, index) => {
        if (cursorY - rowHeight < bottomMargin) {
          newPage();
          if (group.groupName) {
            pushText(`Grupo ${group.groupName} (cont.)`, marginX, cursorY - 10, "F2", 10.5);
            cursorY -= 18;
          }
          drawHeader();
        }

        const cells = isVolei
          ? [
              String(index + 1),
              fitCellText(entry.teamName, 43),
              String(entry.played),
              String(entry.won),
              String(entry.lost),
              String(entry.setsWon ?? 0),
              String(entry.setsLost ?? 0),
              String(entry.points),
            ]
          : [
              String(index + 1),
              fitCellText(entry.teamName, 38),
              String(entry.played),
              String(entry.won),
              String(entry.drawn),
              String(entry.lost),
              String(entry.goalsFor),
              String(entry.goalsAgainst),
              String(entry.goalDiff),
              String(entry.points),
            ];

        const rowBottom = cursorY - rowHeight;
        let x = marginX;
        for (let i = 0; i < cells.length; i++) {
          const width = columnWidths[i];
          strokeRect(x, rowBottom, width, rowHeight);
          if (i === 1) {
            pushText(cells[i], x + 5, cursorY - rowHeight / 2 - 3, "F1", 9);
          } else {
            centerText(cells[i], x + width / 2, cursorY - rowHeight / 2 - 3, i === cells.length - 1 ? "F2" : "F1", 9);
          }
          x += width;
        }
        cursorY = rowBottom;
      });

      cursorY -= 14;
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
