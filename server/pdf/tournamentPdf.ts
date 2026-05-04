type TournamentLike = {
  id: number;
  name: string;
  category: string;
  modality: string;
  status?: string | null;
};

type TeamLike = {
  id: number;
  name: string;
  shortName: string;
  groupName?: string | null;
};

type MatchLike = {
  id: number;
  phase: "group" | "quarterfinal" | "semifinal" | "third_place" | "final";
  round: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number | null;
  awayScore: number | null;
  status?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
};

type BuildTournamentMatchesPdfInput = {
  tournament: TournamentLike;
  teams: TeamLike[];
  matches: MatchLike[];
  generatedAt?: Date;
};

const PHASE_LABELS: Record<MatchLike["phase"], string> = {
  group: "Fase de Grupos",
  quarterfinal: "Quartas de Final",
  semifinal: "Semifinais",
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

const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  group_stage: "Fase de Grupos",
  semifinals: "Semifinais",
  final: "Final",
  finished: "Encerrado",
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  finished: "Finalizada",
};

function formatDateTime(value?: string | null, time?: string | null): string {
  const dateText = (value || "").trim();
  const timeText = (time || "").trim();

  if (!dateText && !timeText) return "";
  if (!dateText) return timeText;
  if (!timeText) return dateText;
  return `${dateText} ${timeText}`;
}

function formatScore(homeScore: number | null, awayScore: number | null): string {
  if (homeScore === null || awayScore === null) return "- x -";
  return `${homeScore} x ${awayScore}`;
}

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

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];

  const words = line.split(/\s+/).filter(Boolean);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) wrapped.push(current);

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    let chunkStart = 0;
    while (chunkStart < word.length) {
      const part = word.slice(chunkStart, chunkStart + maxChars);
      if (part.length === maxChars || chunkStart + maxChars < word.length) {
        wrapped.push(part);
      } else {
        current = part;
      }
      chunkStart += maxChars;
    }
  }

  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [line];
}

type TableRow = {
  date: string;
  time: string;
  category: string;
  court: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
};

type RoundBlock = {
  title: string;
  rows: TableRow[];
};

function formatShortDate(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "-";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return `${match[3]}/${match[2]}`;
}

function splitCourtAndLocation(value?: string | null): { court: string; location: string } {
  const raw = (value || "").trim();
  if (!raw) return { court: "-", location: "-" };

  const parts = raw.split(/\s*-\s*/).filter(Boolean);
  if (parts.length <= 1) {
    return { court: parts[0] || "-", location: "-" };
  }

  const [court, ...locationParts] = parts;
  return {
    court: court || "-",
    location: locationParts.join(" - ").trim() || "-",
  };
}

function fitCellText(value: string, maxChars: number): string {
  const text = normalizeForPdfText((value || "-").trim() || "-");
  if (text.length <= maxChars) return text;
  const cut = Math.max(1, maxChars - 3);
  return `${text.slice(0, cut).trimEnd()}...`;
}

function buildRoundBlocks(input: BuildTournamentMatchesPdfInput): RoundBlock[] {
  const { tournament, teams, matches } = input;
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const sortedMatches = [...matches].sort((a, b) => {
    const phaseDiff = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    if ((a.round || 0) !== (b.round || 0)) return (a.round || 0) - (b.round || 0);
    return a.id - b.id;
  });

  const mapRows = (phaseMatches: MatchLike[]): TableRow[] => {
    return phaseMatches.map((match) => {
      const homeTeam = teamById.get(match.homeTeamId);
      const awayTeam = teamById.get(match.awayTeamId);
      const courtAndLocation = splitCourtAndLocation(match.location);
      const statusKey = (match.status || "").trim().toLowerCase();
      const statusText = (MATCH_STATUS_LABELS[statusKey] ?? (match.status || "").trim()) || "-";
      return {
        date: formatShortDate(match.date),
        time: (match.time || "").trim() || "-",
        category: tournament.category,
        court: courtAndLocation.court,
        location: statusText !== "-" ? `${courtAndLocation.location} (${statusText})` : courtAndLocation.location,
        homeTeam: homeTeam?.name || `Equipe ${match.homeTeamId}`,
        awayTeam: awayTeam?.name || `Equipe ${match.awayTeamId}`,
      };
    });
  };

  const blocks: RoundBlock[] = [];

  for (const phase of PHASE_ORDER) {
    const phaseMatches = sortedMatches.filter((match) => match.phase === phase);
    if (phaseMatches.length === 0) continue;

    if (phase === "group") {
      const groupNames = teams
        .map((team) => (team.groupName || "").trim())
        .filter((group): group is string => group.length > 0)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .sort();

      const groupsToUse = groupNames.length > 0 ? groupNames : ["A"];

      for (const groupName of groupsToUse) {
        const groupTeamIds = new Set(
          teams
            .filter((team) => (team.groupName || "A") === groupName)
            .map((team) => team.id)
        );

        const groupMatches = phaseMatches.filter(
          (match) => groupTeamIds.has(match.homeTeamId) && groupTeamIds.has(match.awayTeamId)
        );

        if (groupMatches.length === 0) continue;

        const rounds = groupMatches
          .map((match) => match.round)
          .filter((round, index, arr) => arr.indexOf(round) === index)
          .sort((a, b) => a - b);

        for (const round of rounds) {
          const roundMatches = groupMatches.filter((item) => item.round === round);
          blocks.push({
            title: `GRUPO ${groupName} - ${round}a RODADA`,
            rows: mapRows(roundMatches),
          });
        }
      }

      continue;
    }

    const rounds = phaseMatches
      .map((match) => match.round)
      .filter((round, index, arr) => arr.indexOf(round) === index)
      .sort((a, b) => a - b);

    for (const round of rounds) {
      const roundMatches = phaseMatches.filter((item) => item.round === round);
      blocks.push({
        title: `${PHASE_LABELS[phase].toUpperCase()} - ${round}a RODADA`,
        rows: mapRows(roundMatches),
      });
    }
  }

  return blocks;
}

function buildTournamentTablePdf(input: BuildTournamentMatchesPdfInput): Buffer {
  const { tournament, matches, generatedAt = new Date() } = input;

  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const modalityLabel = MODALITY_LABELS[String(tournament.modality || "").toLowerCase()] ?? tournament.modality;
  const tournamentStatusLabel = TOURNAMENT_STATUS_LABELS[String(tournament.status || "").toLowerCase()] ?? tournament.status ?? "-";
  const roundBlocks = buildRoundBlocks(input);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 30;
  const topMargin = 28;
  const bottomMargin = 28;
  const tableWidth = pageWidth - marginX * 2;
  const columnWidths = [45, 46, 70, 62, 110, 18, 110, 74];
  const columns = ["Dia", "Horario", "Categoria", "Quadra", "Equipe A", "vs", "Equipe B", "Local"];

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

  newPage();

  const metadataLines = [
    { text: "LEG - Tabela Oficial de Jogos", font: "F2" as const, size: 13 },
    { text: `Campeonato: ${tournament.name}`, font: "F2" as const, size: 10 },
    { text: `Categoria: ${tournament.category} | Modalidade: ${modalityLabel}`, font: "F1" as const, size: 10 },
    { text: `Status: ${tournamentStatusLabel}`, font: "F1" as const, size: 10 },
    { text: `Gerado em: ${generatedLabel}`, font: "F1" as const, size: 10 },
  ];

  for (const line of metadataLines) {
    ensureSpace(14);
    pushText(line.text, marginX, cursorY - 10, line.font, line.size);
    cursorY -= 14;
  }

  cursorY -= 8;

  if (matches.length === 0 || roundBlocks.length === 0) {
    ensureSpace(16);
    pushText("Nenhuma partida cadastrada neste campeonato.", marginX, cursorY - 10, "F1", 10);
  } else {
    for (const block of roundBlocks) {
      const wrappedRows = block.rows.map((row) => {
        const cellValues = [
          row.date,
          row.time,
          row.category,
          row.court,
          row.homeTeam,
          "vs",
          row.awayTeam,
          row.location,
        ];

        const cells = cellValues.map((value, index) => {
          const width = columnWidths[index];
          const approxMaxChars = Math.max(4, Math.floor((width - 6) / 4.6));
          return fitCellText(value, approxMaxChars);
        });

        return { cells };
      });

      const rowHeight = 20;
      const blockHeight = 20 + 18 + wrappedRows.length * rowHeight + 12;
      ensureSpace(blockHeight);

      const titleBottom = cursorY - 20;
      commands.push("0.98 0.88 0.10 rg");
      commands.push(`${marginX} ${titleBottom.toFixed(2)} ${tableWidth} 20 re B`);
      commands.push("0 0 0 rg");
      pushText(block.title, marginX + 6, cursorY - 14, "F2", 10);
      cursorY = titleBottom;

      const headerBottom = cursorY - 18;
      let x = marginX;
      commands.push("0.88 0.88 0.88 rg");
      for (let i = 0; i < columns.length; i++) {
        const width = columnWidths[i];
        commands.push(`${x} ${headerBottom.toFixed(2)} ${width} 18 re B`);
        commands.push("0 0 0 rg");
        pushText(columns[i], x + 3, cursorY - 12, "F2", 8);
        x += width;
      }
      cursorY = headerBottom;

      for (const row of wrappedRows) {
        const rowBottom = cursorY - rowHeight;
        let colX = marginX;

        for (let i = 0; i < row.cells.length; i++) {
          const width = columnWidths[i];
          commands.push(`${colX} ${rowBottom.toFixed(2)} ${width} ${rowHeight.toFixed(2)} re S`);
          pushText(row.cells[i], colX + 3, cursorY - 13, "F1", 8);

          colX += width;
        }

        cursorY = rowBottom;
      }

      cursorY -= 12;
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

export function buildTournamentMatchesPdf(input: BuildTournamentMatchesPdfInput): Buffer {
  return buildTournamentTablePdf(input);
}
