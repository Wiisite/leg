import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TournamentLike = {
  id?: number;
  name?: string | null;
  category?: string | null;
  createdAt?: Date | string | null;
};

function normalizeTournamentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCategoryRank(source: string) {
  const subMatch = source.match(/sub\s*-?\s*(\d+)/);
  if (subMatch) return Number(subMatch[1]);
  const numberMatch = source.match(/\b(\d{1,2})\b/);
  if (numberMatch) return Number(numberMatch[1]);
  return 999;
}

function getGenderRank(source: string) {
  if (/\bmasc|masculino/.test(source)) return 0;
  if (/\bfem|feminino/.test(source)) return 1;
  return 2;
}

function getDivisionRank(source: string) {
  if (/(1a|1o|primeira|1\.)\s*divis|serie\s*ouro|\bouro\b/.test(source)) return 0;
  if (/(2a|2o|segunda|2\.)\s*divis|serie\s*prata|\bprata\b/.test(source)) return 1;
  if (/(3a|3o|terceira|3\.)\s*divis|serie\s*bronze|\bbronze\b/.test(source)) return 2;
  return 3;
}

export function sortTournamentsByCategoryGenderDivision<T extends TournamentLike>(tournaments: readonly T[]) {
  return [...tournaments].sort((a, b) => {
    const sourceA = normalizeTournamentText(`${a.category ?? ""} ${a.name ?? ""}`);
    const sourceB = normalizeTournamentText(`${b.category ?? ""} ${b.name ?? ""}`);
    const categoryDiff = getCategoryRank(sourceA) - getCategoryRank(sourceB);
    if (categoryDiff !== 0) return categoryDiff;
    const genderDiff = getGenderRank(sourceA) - getGenderRank(sourceB);
    if (genderDiff !== 0) return genderDiff;
    const divisionDiff = getDivisionRank(sourceA) - getDivisionRank(sourceB);
    if (divisionDiff !== 0) return divisionDiff;
    const labelDiff = `${a.category ?? ""} ${a.name ?? ""}`.localeCompare(`${b.category ?? ""} ${b.name ?? ""}`, "pt-BR");
    if (labelDiff !== 0) return labelDiff;
    return Number(a.id ?? 0) - Number(b.id ?? 0);
  });
}
