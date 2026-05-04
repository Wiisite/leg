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

function toAsciiSafe(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    result += code <= 255 ? char : "?";
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

function paginateLines(lines: string[], linesPerPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  return pages.length > 0 ? pages : [["Sem dados para exportar."]];
}

function buildPdfBufferFromLines(lines: string[]): Buffer {
  const maxCharsPerLine = 94;
  const expandedLines = lines.flatMap((line) => wrapLine(line, maxCharsPerLine));
  const pages = paginateLines(expandedLines, 52);

  const catalogId = 1;
  const pagesId = 2;
  const fontId = 3;

  const objects: Record<number, string> = {};
  const pageObjectIds: number[] = [];

  let nextId = 4;

  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;

    pageObjectIds.push(pageId);

    const contentCommands: string[] = [
      "BT",
      "/F1 11 Tf",
      "40 800 Td",
      "14 TL",
    ];

    pageLines.forEach((rawLine, index) => {
      const normalized = rawLine.replace(/\s+/g, " ").trim();
      const escaped = escapePdfString(normalized.length > 0 ? normalized : " ");
      if (index === 0) {
        contentCommands.push(`(${escaped}) Tj`);
      } else {
        contentCommands.push(`T* (${escaped}) Tj`);
      }
    });

    contentCommands.push("ET");

    const streamContent = contentCommands.join("\n");
    const streamLength = Buffer.byteLength(streamContent, "latin1");

    objects[contentId] = `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

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

function buildSectionLines(input: BuildTournamentMatchesPdfInput): string[] {
  const { tournament, teams, matches, generatedAt = new Date() } = input;

  const lines: string[] = [];
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const generatedLabel = generatedAt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  lines.push("LEG - Tabela Oficial de Jogos");
  lines.push(`Campeonato: ${tournament.name}`);
  lines.push(`Categoria: ${tournament.category} | Modalidade: ${tournament.modality}`);
  lines.push(`Status: ${tournament.status || "-"}`);
  lines.push(`Gerado em: ${generatedLabel}`);
  lines.push("");

  if (matches.length === 0) {
    lines.push("Nenhuma partida cadastrada neste campeonato.");
    return lines;
  }

  const sortedMatches = [...matches].sort((a, b) => {
    const phaseDiff = PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase);
    if (phaseDiff !== 0) return phaseDiff;
    if ((a.round || 0) !== (b.round || 0)) return (a.round || 0) - (b.round || 0);
    return a.id - b.id;
  });

  for (const phase of PHASE_ORDER) {
    const phaseMatches = sortedMatches.filter((match) => match.phase === phase);
    if (phaseMatches.length === 0) continue;

    lines.push(`=== ${PHASE_LABELS[phase]} ===`);

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

        lines.push(`Grupo ${groupName}`);

        const rounds = groupMatches
          .map((match) => match.round)
          .filter((round, index, arr) => arr.indexOf(round) === index)
          .sort((a, b) => a - b);

        for (const round of rounds) {
          lines.push(`  Rodada ${round}`);
          for (const match of groupMatches.filter((item) => item.round === round)) {
            const homeTeam = teamById.get(match.homeTeamId);
            const awayTeam = teamById.get(match.awayTeamId);
            const homeName = homeTeam?.shortName || homeTeam?.name || `Equipe ${match.homeTeamId}`;
            const awayName = awayTeam?.shortName || awayTeam?.name || `Equipe ${match.awayTeamId}`;
            const score = formatScore(match.homeScore, match.awayScore);
            const dateAndTime = formatDateTime(match.date, match.time);
            const location = (match.location || "").trim();
            const status = (match.status || "").trim();

            const details: string[] = [];
            if (dateAndTime) details.push(dateAndTime);
            if (location) details.push(location);
            if (status) details.push(status);

            const suffix = details.length > 0 ? ` [${details.join(" | ")}]` : "";
            lines.push(`    - ${homeName} ${score} ${awayName}${suffix}`);
          }
        }

        lines.push("");
      }
    } else {
      const rounds = phaseMatches
        .map((match) => match.round)
        .filter((round, index, arr) => arr.indexOf(round) === index)
        .sort((a, b) => a - b);

      for (const round of rounds) {
        lines.push(`Rodada ${round}`);
        for (const match of phaseMatches.filter((item) => item.round === round)) {
          const homeTeam = teamById.get(match.homeTeamId);
          const awayTeam = teamById.get(match.awayTeamId);
          const homeName = homeTeam?.shortName || homeTeam?.name || `Equipe ${match.homeTeamId}`;
          const awayName = awayTeam?.shortName || awayTeam?.name || `Equipe ${match.awayTeamId}`;
          const score = formatScore(match.homeScore, match.awayScore);
          const dateAndTime = formatDateTime(match.date, match.time);
          const location = (match.location || "").trim();
          const status = (match.status || "").trim();

          const details: string[] = [];
          if (dateAndTime) details.push(dateAndTime);
          if (location) details.push(location);
          if (status) details.push(status);

          const suffix = details.length > 0 ? ` [${details.join(" | ")}]` : "";
          lines.push(`  - ${homeName} ${score} ${awayName}${suffix}`);
        }
      }

      lines.push("");
    }
  }

  return lines;
}

export function buildTournamentMatchesPdf(input: BuildTournamentMatchesPdfInput): Buffer {
  const lines = buildSectionLines(input);
  return buildPdfBufferFromLines(lines);
}
