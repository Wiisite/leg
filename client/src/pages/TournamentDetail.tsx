import { useAuth } from "@/_core/hooks/useAuth";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Users,
  BarChart3,
  GitBranch,
  Medal,
  Flag,
  Star,
  CheckCircle2,
  Clock,
  MapPin,
  Trash2,
  Shield,
  Shuffle,
  Edit2,
  Plus,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Tab = "groups" | "standings" | "bracket" | "semifinals" | "final";

type MatchForModal = {
  id: number; 
  homeTeamId: number; 
  awayTeamId: number; 
  homeScore: number | null; 
  awayScore: number | null;
  voleiSetsJson?: string | null;
  time?: string | null;
  location?: string | null;
  status?: string;
  round?: number;
};

function TeamBadge({ team, size = "md", showName = false }: { team: any; size?: "sm" | "md" | "lg"; showName?: boolean }) {
  const sizes = { 
    sm: "w-8 h-8", 
    md: "w-12 h-12", 
    lg: "w-20 h-20" 
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size]} rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm`}>
        {team?.logo ? (
          <img src={team.logo} alt={team.shortName} className="w-full h-full object-contain p-1" />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-black"
            style={{ backgroundColor: team?.color || "#cbd5e1", fontSize: size === 'lg' ? '24px' : '10px' }}
          >
            {team?.shortName?.slice(0, 3) || "?"}
          </div>
        )}
      </div>
      {showName && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px] text-center">{team?.shortName}</span>}
    </div>
  );
}

function ScoreModal({
  match,
  teams,
  modality,
  championshipAddresses,
  onClose,
  onSave,
}: {
  match: MatchForModal;
  teams: { id: number; name: string; shortName: string; color: string; logo?: string | null }[];
  modality?: string;
  championshipAddresses?: string[];
  onClose: () => void;
  onSave: (
    matchId: number,
    home: number,
    away: number,
    time: string,
    location: string,
    voleiSets?: { home: number; away: number }[]
  ) => void;
}) {
  const isVolei = modality === "volei";
  const isBasquete = modality === "basquete";
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [time, setTime] = useState(match.time ?? "");
  const [location, setLocation] = useState(match.location ?? "");
  const addressOptions = useMemo(
    () => (championshipAddresses || []).map((address) => address.trim()).filter((address, index, arr) => address.length > 0 && arr.indexOf(address) === index),
    [championshipAddresses]
  );
  const locationOptions = useMemo(() => {
    if (location.trim().length === 0 || addressOptions.includes(location)) return addressOptions;
    return [location, ...addressOptions];
  }, [addressOptions, location]);
  const [voleiSetsInput, setVoleiSetsInput] = useState<{ home: string; away: string }[]>(() => {
    if (!match.voleiSetsJson) return [{ home: "", away: "" }, { home: "", away: "" }, { home: "", away: "" }];
    try {
      const parsed = JSON.parse(match.voleiSetsJson);
      if (!Array.isArray(parsed)) return [{ home: "", away: "" }, { home: "", away: "" }, { home: "", away: "" }];
      const normalized = parsed
        .map((set) => ({
          home: Number(set?.home),
          away: Number(set?.away),
        }))
        .filter((set) => Number.isFinite(set.home) && Number.isFinite(set.away) && set.home >= 0 && set.away >= 0)
        .slice(0, 3)
        .map((set) => ({ home: String(set.home), away: String(set.away) }));

      while (normalized.length < 3) {
        normalized.push({ home: "", away: "" });
      }
      return normalized;
    } catch {
      return [{ home: "", away: "" }, { home: "", away: "" }, { home: "", away: "" }];
    }
  });

  const parsedVoleiSets = voleiSetsInput
    .map((set) => ({
      home: set.home.trim() === "" ? NaN : Number(set.home),
      away: set.away.trim() === "" ? NaN : Number(set.away),
    }))
    .filter((set) => Number.isFinite(set.home) && Number.isFinite(set.away) && set.home >= 0 && set.away >= 0)
    .map((set) => ({ home: Math.floor(set.home), away: Math.floor(set.away) }));

  const voleiHomeSets = parsedVoleiSets.reduce((acc, set) => acc + (set.home > set.away ? 1 : 0), 0);
  const voleiAwaySets = parsedVoleiSets.reduce((acc, set) => acc + (set.away > set.home ? 1 : 0), 0);
  const hasSetDraw = parsedVoleiSets.some((set) => set.home === set.away);
  const hasVoleiWinner = voleiHomeSets === 2 || voleiAwaySets === 2;
  const voleiHasEnoughSets = parsedVoleiSets.length >= 2 && parsedVoleiSets.length <= 3;
  const invalidStraightWinIn3Sets =
    parsedVoleiSets.length === 3 &&
    ((voleiHomeSets === 2 && voleiAwaySets === 0) || (voleiAwaySets === 2 && voleiHomeSets === 0));
  const voleiValid =
    !isVolei ||
    (voleiHasEnoughSets && !hasSetDraw && hasVoleiWinner && !invalidStraightWinIn3Sets);

  const effectiveHome = isVolei ? voleiHomeSets : home;
  const effectiveAway = isVolei ? voleiAwaySets : away;
  const basqueteValid = !isBasquete || effectiveHome !== effectiveAway;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">
        <h3 className="font-black text-2xl text-center mb-8 text-slate-800 tracking-tight uppercase">
          {isVolei ? "Registrar Sets" : "Registrar Placar"}
        </h3>
        
        <div className="flex items-center gap-6 justify-between mb-10">
          <div className="flex-1 flex flex-col items-center gap-3">
            <TeamBadge team={homeTeam} size="lg" />
            <p className="text-[11px] font-black text-slate-400 uppercase text-center leading-tight min-h-[2.5rem] flex items-center">{homeTeam?.name}</p>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            {isVolei && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sets</span>}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={isVolei ? 2 : undefined}
                value={isVolei ? effectiveHome : home}
                onChange={(e) => {
                  if (isVolei) return;
                  setHome(Math.max(0, parseInt(e.target.value) || 0));
                }}
                readOnly={isVolei}
                className={`w-16 h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 focus:outline-none focus:border-red transition-all ${isVolei ? "cursor-not-allowed opacity-80" : ""}`}
              />
              <span className="text-slate-200 font-black text-xl">×</span>
              <input
                type="number"
                min={0}
                max={isVolei ? 2 : undefined}
                value={isVolei ? effectiveAway : away}
                onChange={(e) => {
                  if (isVolei) return;
                  setAway(Math.max(0, parseInt(e.target.value) || 0));
                }}
                readOnly={isVolei}
                className={`w-16 h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 focus:outline-none focus:border-red transition-all ${isVolei ? "cursor-not-allowed opacity-80" : ""}`}
              />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center gap-3">
            <TeamBadge team={awayTeam} size="lg" />
            <p className="text-[11px] font-black text-slate-400 uppercase text-center leading-tight min-h-[2.5rem] flex items-center">{awayTeam?.name}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="14:30"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-red/20 transition-all shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Local</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                {locationOptions.length > 0 ? (
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-red/20 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Selecione um endereço</option>
                    {locationOptions.map((address) => (
                      <option key={address} value={address}>
                        {address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ginásio"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-red/20 transition-all shadow-sm"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {isVolei && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3">Placares por set (melhor de 3)</p>
            <div className="space-y-2">
              {voleiSetsInput.map((set, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={set.home}
                    onChange={(e) => {
                      const next = [...voleiSetsInput];
                      next[idx] = { ...next[idx], home: e.target.value };
                      setVoleiSetsInput(next);
                    }}
                    placeholder="0"
                    className="w-full px-2 py-2 text-center text-sm font-black bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs font-black text-amber-600">×</span>
                  <input
                    type="number"
                    min={0}
                    value={set.away}
                    onChange={(e) => {
                      const next = [...voleiSetsInput];
                      next[idx] = { ...next[idx], away: e.target.value };
                      setVoleiSetsInput(next);
                    }}
                    placeholder="0"
                    className="w-full px-2 py-2 text-center text-sm font-black bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Set {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isVolei && !voleiValid && parsedVoleiSets.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-[11px] font-bold text-red-500">Resultado inválido no vôlei. Informe 2 ou 3 sets, sem empate por set, com placar final 2×0 ou 2×1.</p>
          </div>
        )}

        {isBasquete && !basqueteValid && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-[11px] font-bold text-red-500">No basquete não existe empate. Informe um vencedor da partida.</p>
          </div>
        )}

        {isVolei && voleiValid && parsedVoleiSets.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-700">
                {(() => {
                  const w = Math.max(effectiveHome, effectiveAway), l = Math.min(effectiveHome, effectiveAway);
                  const dominant = w === 2 && l === 0;
                  return dominant ? "Vitória direta → 3 pts / 0 pts" : "Vitória apertada → 2 pts / 1 pt";
                })()}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button 
            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={`flex-[2] bg-red hover:bg-red-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red/20 transition-all active:scale-95 ${(isVolei && !voleiValid) || (isBasquete && !basqueteValid) ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={(isVolei && !voleiValid) || (isBasquete && !basqueteValid)}
            onClick={() =>
              onSave(
                match.id,
                effectiveHome,
                effectiveAway,
                time,
                location,
                isVolei ? parsedVoleiSets : undefined
              )
            }
          >
            SALVAR RESULTADO
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  teams,
  isAdmin,
  onEdit,
}: {
  match: MatchForModal;
  teams: any[];
  isAdmin: boolean;
  onEdit?: (m: MatchForModal) => void;
}) {
  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const finished = match.homeScore !== null;

  return (
    <div className="bg-slate-50/95 border border-slate-200 p-6 rounded-[32px] shadow-sm hover:shadow-md hover:border-slate-300 transition-all group border-b-4 border-b-slate-300">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex-1 flex flex-col items-center gap-3">
          <TeamBadge team={home} size="md" />
          <span className="text-[11px] font-black text-slate-700 uppercase text-center leading-tight min-h-[2.5rem] flex items-center justify-center px-2">{home?.name}</span>
        </div>
        
        <div className="flex flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-black ${finished ? 'text-slate-800' : 'text-slate-300'}`}>
              {match.homeScore ?? "0"}
            </span>
            <span className="text-slate-300 font-black text-xl">×</span>
            <span className={`text-4xl font-black ${finished ? 'text-slate-800' : 'text-slate-300'}`}>
              {match.awayScore ?? "0"}
            </span>
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-full border border-slate-300">
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">VS</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-3">
          <TeamBadge team={away} size="md" />
          <span className="text-[11px] font-black text-slate-700 uppercase text-center leading-tight min-h-[2.5rem] flex items-center justify-center px-2">{away?.name}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">{match.time || "A DEFINIR"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[120px]">{match.location || "A DEFINIR"}</span>
          </div>
        </div>
        
        {isAdmin && onEdit && (
          <Button 
            size="sm" 
            onClick={() => onEdit(match)}
            className="bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-600 text-[10px] font-black uppercase px-6 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            {finished ? "Editar" : "Registrar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function MatchCardCompact({
  match,
  teams,
  isAdmin,
  onEdit,
}: {
  match: MatchForModal;
  teams: any[];
  isAdmin: boolean;
  onEdit?: (m: MatchForModal) => void;
}) {
  const home = teams.find((t) => t.id === match.homeTeamId);
  const away = teams.find((t) => t.id === match.awayTeamId);
  const finished = match.homeScore !== null;

  return (
    <div className="bg-slate-50/95 border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all border-b-4 border-b-slate-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 flex flex-col items-center gap-2">
          <TeamBadge team={home} size="md" />
          <span className="text-[10px] font-black text-slate-700 uppercase text-center leading-tight">{home?.shortName}</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2">
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-black ${finished ? 'text-slate-800' : 'text-slate-300'}`}>
              {match.homeScore ?? "0"}
            </span>
            <span className="text-slate-300 font-black text-sm">×</span>
            <span className={`text-2xl font-black ${finished ? 'text-slate-800' : 'text-slate-300'}`}>
              {match.awayScore ?? "0"}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2">
          <TeamBadge team={away} size="md" />
          <span className="text-[10px] font-black text-slate-700 uppercase text-center leading-tight">{away?.shortName}</span>
        </div>
      </div>

      {isAdmin && onEdit && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-center">
          <Button 
            size="sm" 
            onClick={() => onEdit(match)}
            className="bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-600 text-[9px] font-black uppercase px-4 py-1 rounded-xl transition-all shadow-sm active:scale-95"
          >
            {finished ? "Editar" : "Registrar"}
          </Button>
        </div>
      )}
    </div>
  );
}

function StandingsTable({ standings, modality }: { standings: any[]; modality?: string }) {
  const isVolei = modality === "volei";
  const hideDrawColumn = modality === "volei" || modality === "basquete";
  const formatRatio = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.000";
    return value.toFixed(3);
  };

  return (
    <div className="overflow-x-auto rounded-[32px] border border-slate-100 shadow-sm bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="py-6 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
            <th className="py-6 px-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe</th>
            <th className="py-6 px-6 text-center text-[10px] font-black text-red uppercase tracking-widest w-20">Pts</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">J</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">V</th>
            {!hideDrawColumn && <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">E</th>}
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">D</th>
            {isVolei ? (
              <>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sets Ganhos</th>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sets Perdidos</th>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Sets Average</th>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Ganhos</th>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Sofridos</th>
                <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos Average</th>
              </>
            ) : (
              <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">SG</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {standings.map((s, i) => (
            <tr key={s.teamId} className={`group transition-colors hover:bg-slate-50/80 ${i < 2 ? 'bg-amber-50/20' : ''}`}>
              <td className="py-5 px-6">
                <span className={`text-xs font-black ${i < 2 ? 'text-red' : 'text-slate-400'}`}>{i + 1}</span>
              </td>
              <td className="py-5 px-4">
                <div className="flex items-center gap-4">
                  <TeamBadge team={s} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{s.teamName}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{s.shortName}</span>
                  </div>
                </div>
              </td>
              <td className="py-5 px-6 text-center">
                <span className="text-lg font-black text-red">{s.points}</span>
              </td>
              <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.played}</td>
              <td className="py-5 px-3 text-center text-sm font-black text-green-600">{s.won}</td>
              {!hideDrawColumn && <td className="py-5 px-3 text-center text-sm font-black text-amber-500">{s.drawn}</td>}
              <td className="py-5 px-3 text-center text-sm font-black text-red-500">{s.lost}</td>
              {isVolei ? (
                <>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.setsWon ?? s.goalsFor}</td>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.setsLost ?? s.goalsAgainst}</td>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{formatRatio(s.setsAverage)}</td>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.pointsWon ?? 0}</td>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.pointsLost ?? 0}</td>
                  <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{formatRatio(s.pointsAverage)}</td>
                </>
              ) : (
                <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {standings.length >= 2 && (
        <div className="px-6 py-4 bg-amber-50/30 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm" />
            <p className="text-[10px] font-black text-amber-900/40 uppercase tracking-widest">Zona de Classificação (Semifinal)</p>
          </div>
        </div>
      )}
    </div>
  );
}

function BracketView({
  bracket,
  teams,
}: {
  bracket: any;
  teams: any[];
}) {
  const getWinner = (m: any) => {
    if (m.homeScore === null) return null;
    if (m.homeScore > m.awayScore) return m.homeTeamId;
    if (m.awayScore > m.homeScore) return m.awayTeamId;
    return m.homeTeamId;
  };

  const BracketMatch = ({ match, label }: { match: any; label?: string }) => {
    const home = teams.find(t => t.id === match.homeTeamId);
    const away = teams.find(t => t.id === match.awayTeamId);
    const winner = getWinner(match);

    return (
      <div className="flex flex-col gap-2 w-64">
        {label && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">{label}</span>}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/50">
          {[
            { team: home, score: match.homeScore, id: match.homeTeamId },
            { team: away, score: match.awayScore, id: match.awayTeamId }
          ].map((t, idx) => (
            <div key={idx} className={`flex items-center justify-between px-4 py-3 ${idx === 0 ? 'border-b border-slate-50' : ''} ${winner === t.id ? 'bg-amber-50/30' : ''}`}>
              <div className="flex items-center gap-3">
                <TeamBadge team={t.team} size="sm" />
                <span className={`text-[11px] font-black uppercase truncate max-w-[100px] ${winner === t.id ? 'text-red' : 'text-slate-600'}`}>
                  {t.team?.name || "A DEFINIR"}
                </span>
              </div>
              <span className={`text-sm font-black ${winner === t.id ? 'text-red' : 'text-slate-300'}`}>
                {t.score ?? "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const finalMatch = bracket.final[0];
  const finalWinner = finalMatch ? getWinner(finalMatch) : null;
  const champion = finalWinner ? teams.find(t => t.id === finalWinner) : null;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-start gap-12 min-w-max px-4 py-6">
        {/* Semis */}
        <div className="flex flex-col gap-8 justify-center">
          <div className="text-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Semifinais
            </span>
          </div>
          {bracket.semifinal.length === 0 ? (
            <div className="w-56 h-24 bg-card border border-dashed border-border/40 rounded-xl flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Aguardando fase de grupos</span>
            </div>
          ) : (
            bracket.semifinal.map((m: any, i: number) => (
              <BracketMatch key={m.id} match={m} label={`Semifinal ${i + 1}`} />
            ))
          )}
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center justify-center self-center mt-6">
          <div className="w-8 h-px bg-border/60" />
        </div>

        {/* Final */}
        <div className="flex flex-col items-center gap-4 justify-center self-center">
          <div className="text-center mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Final
            </span>
          </div>
          {bracket.final.length === 0 ? (
            <div className="w-56 h-24 bg-card border border-dashed border-border/40 rounded-xl flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Aguardando semifinais</span>
            </div>
          ) : (
            <BracketMatch match={bracket.final[0]} label="Grande Final" />
          )}
          {champion && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="w-px h-6 bg-gold/40" />
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-red/20 shadow-brand">
                <Trophy className="w-4 h-4 text-red" />
                <span className="text-sm font-bold text-primary">{champion.name}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditTournamentModal({
  tournament,
  teams,
  onClose,
  onSave,
}: {
  tournament: { id: number; name: string; category: string; modality: string; rounds: number };
  teams: { id: number; name: string; shortName: string; color: string; logo: string | null }[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(tournament.name);
  const [category, setCategory] = useState(tournament.category);
  const [modality, setModality] = useState(tournament.modality as any);
  const [rounds, setRounds] = useState(tournament.rounds ?? 5);
  const [teamList, setTeamList] = useState(teams);

  const handleUpdateTeam = (index: number, field: string, value: string) => {
    const newTeams = [...teamList];
    (newTeams[index] as any)[field] = value;
    setTeamList(newTeams);
  };

  const handleLogoUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateTeam(index, "logo", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTeam = () => {
    setTeamList([...teamList, { id: undefined as any, name: "", shortName: "", color: "#1e40af", logo: "" }]);
  };

  const handleRemoveTeam = (index: number) => {
    setTeamList(teamList.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-2xl shadow-premium max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-2xl font-bold">Editar Torneio</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nome do Torneio</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-red/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-red/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Modalidade</label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-red/20"
            >
              <option value="futsal">Futsal</option>
              <option value="basquete">Basquete</option>
              <option value="volei">Vôlei</option>
              <option value="handebol">Handebol</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Número de Rodadas</label>
            <input
              type="number"
              min={1}
              value={rounds}
              onChange={(e) => setRounds(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:ring-2 focus:ring-red/20"
            />
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipes Participantes</label>
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold" onClick={handleAddTeam}>
              <Plus className="w-3 h-3 mr-1" /> Adicionar Equipe
            </Button>
          </div>
          <div className="space-y-3">
            {teamList.map((team, idx) => (
              <div key={idx} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative group shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {team.logo ? (
                        <img src={team.logo} className="w-full h-full object-contain" />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-xl">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleLogoUpload(idx, e.target.files[0])}
                      />
                      <Edit2 className="w-5 h-5 text-white" />
                    </label>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do Colégio / Equipe"
                        value={team.name}
                        onChange={(e) => handleUpdateTeam(idx, "name", e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-red/20"
                      />
                      <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-red hover:bg-red/5 shrink-0" onClick={() => handleRemoveTeam(idx)}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Sigla (Ex: COL)"
                        value={team.shortName}
                        onChange={(e) => handleUpdateTeam(idx, "shortName", e.target.value)}
                        className="w-32 px-4 py-2 bg-white border border-border rounded-xl text-xs uppercase font-black tracking-widest text-center shadow-sm"
                      />
                      <div className="flex-1" /> {/* Espaçador */}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border/50">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button 
            className="flex-1 bg-red text-white font-bold hover:opacity-90 shadow-brand"
            onClick={() => onSave({ name, category, modality, rounds, teams: teamList })}
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const tournamentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editingMatch, setEditingMatch] = useState<null | MatchForModal>(null);
  const [showGroupSetup, setShowGroupSetup] = useState(false);
  const [groupMode, setGroupMode] = useState<"auto" | "manual">("auto");
  const [manualAssignment, setManualAssignment] = useState<Record<number, "A" | "B">>({});

  const { data, refetch, isLoading, error } = trpc.tournament.getById.useQuery({ id: tournamentId });
  const { data: siteSettings } = trpc.site.getSettings.useQuery();
  const { data: standings } = trpc.tournament.getStandings.useQuery({ tournamentId });
  const { data: bracket, refetch: refetchBracket } = trpc.tournament.getBracket.useQuery({
    tournamentId,
  });

  const utils = trpc.useUtils();
  const updateScore = trpc.match.updateScore.useMutation({
    onSuccess: () => {
      refetch();
      refetchBracket();
      utils.tournament.getStandings.invalidate({ tournamentId });
      setEditingMatch(null);
      toast.success("Dados da partida atualizados!");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateGroups = trpc.tournament.generateGroupMatches.useMutation({
    onSuccess: () => { refetch(); toast.success("Confrontos gerados!"); },
    onError: (e) => toast.error(e.message),
  });

  const generateSemis = trpc.tournament.generateSemifinals.useMutation({
    onSuccess: () => { refetch(); refetchBracket(); setActiveTab("semifinals"); toast.success("Semifinais geradas!"); },
    onError: (e) => toast.error(e.message),
  });

  const generateFinal = trpc.tournament.generateFinal.useMutation({
    onSuccess: () => { refetch(); refetchBracket(); setActiveTab("final"); toast.success("Final gerada!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.tournament.delete.useMutation({
    onSuccess: () => {
      navigate("/admin");
      toast.success("Torneio excluído.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = () => {
    if (confirm(`Excluir permanentemente o torneio "${tournament.name}"?`)) {
      deleteMutation.mutate({ tournamentId });
    }
  };

  const updateTournament = trpc.tournament.update.useMutation({
    onSuccess: () => {
      toast.success("Torneio atualizado com sucesso!");
      setIsEditingTournament(false);
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao atualizar: " + err.message);
    }
  });

  const fixDb = trpc.seed.fixDatabase.useMutation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-red border-t-transparent animate-spin" />
          <p className="text-slate-400 font-bold text-sm animate-pulse">Carregando dados da Liga...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red/10 flex items-center justify-center mb-6">
          <Trophy className="w-8 h-8 text-red opacity-20" />
        </div>
        <h2 className="font-display text-2xl font-bold text-primary mb-2">Ops! Algo deu errado.</h2>
        <div className="bg-red/5 p-4 rounded-xl mb-8 max-w-sm mx-auto">
          <p className="text-red text-xs font-mono break-all">
            Erro: {error?.message || "Falha na conexão com os dados"}
          </p>
        </div>
        <p className="text-slate-500 max-w-sm mb-8 text-sm">
          Não conseguimos carregar os dados deste torneio. Verifique se o banco de dados está atualizado.
        </p>
        <Button onClick={() => navigate("/admin")} className="bg-red text-white font-bold px-8">
          Voltar ao Painel
        </Button>
      </div>
    );
  }

  const { tournament, teams, matches } = data;
  const groupMatches = matches.filter((m) => m.phase === "group");
  const quarterMatches = matches.filter((m) => m.phase === "quarterfinal");
  const semiMatches = matches.filter((m) => m.phase === "semifinal");
  const thirdPlaceMatches = matches.filter((m) => m.phase === "third_place");
  const finalMatches = matches.filter((m) => m.phase === "final");

  const handebolOuroSemi = semiMatches.filter((m: any) => m.bracket === "ouro");
  const handebolPrataSemi = semiMatches.filter((m: any) => m.bracket === "prata");
  const handebolOuroThird = thirdPlaceMatches.filter((m: any) => m.bracket === "ouro");
  const handebolPrataThird = thirdPlaceMatches.filter((m: any) => m.bracket === "prata");
  const handebolOuroFinal = finalMatches.filter((m: any) => m.bracket === "ouro" || !m.bracket);
  const handebolPrataFinal = finalMatches.filter((m: any) => m.bracket === "prata");
  const usesAdvancedSeries =
    tournament.modality === "handebol" ||
    tournament.modality === "futsal" ||
    tournament.modality === "basquete" ||
    tournament.modality === "volei";
  const hasKnockoutMatches = matches.some((m) => m.phase !== "group");
  const isFlatStandings =
    Array.isArray(standings) &&
    standings.length > 0 &&
    !("groupName" in standings[0]);
  const singleGroupStandings = isFlatStandings ? (standings as any[]) : [];
  const classificationTop4 =
    teams.length === 4 && !hasKnockoutMatches && singleGroupStandings.length >= 4
      ? singleGroupStandings.slice(0, 4)
      : [];
  const canShowFinalClassification = tournament.status === "finished" && classificationTop4.length === 4;
  const championDisplayName = tournament.champion || classificationTop4[0]?.teamName || "A definir";

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
    group_stage: { label: "Fase de Grupos", color: "bg-blue-50 text-blue-700" },
    semifinals: { label: "Semifinais", color: "bg-purple-50 text-purple-700" },
    final: { label: "Final", color: "bg-amber-50 text-amber-700" },
    finished: { label: "Encerrado", color: "bg-green-50 text-green-700" },
  };

  const status = STATUS_LABELS[tournament.status] ?? STATUS_LABELS.pending;
  const mainLogoUrl = siteSettings?.mainLogoUrl?.trim() ? siteSettings.mainLogoUrl : "/logo.png";
  const footerLogoUrl = siteSettings?.footerLogoUrl?.trim() ? siteSettings.footerLogoUrl : mainLogoUrl;
  const partners = siteSettings?.partners ?? [];
  const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];
  const modalityLabels: Record<string, string> = {
    futsal: "Futsal",
    basquete: "Basquete",
    volei: "Vôlei",
    handebol: "Handebol",
  };

  const MODALITY_DETAIL_PILLS: Record<string, string[]> = {
    futsal: ["Quadra", "Bola no pe", "Jogo rapido"],
    basquete: ["Garrafao", "3 pontos", "Transicao"],
    volei: ["Rede", "Saque", "Bloqueio"],
    handebol: ["Area 6m", "Ataque", "Defesa"],
  };
  const detailPills = MODALITY_DETAIL_PILLS[tournament.modality] ?? MODALITY_DETAIL_PILLS.futsal;

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "groups", label: "Grupos", icon: Users },
    { id: "standings", label: "Classificação", icon: BarChart3 },
    { id: "bracket", label: "Chaveamento", icon: GitBranch },
    { id: "semifinals", label: "Semifinais", icon: Medal },
    { id: "final", label: "Final", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-white">
      {isEditingTournament && (
        <EditTournamentModal
          tournament={tournament as any}
          teams={teams}
          onClose={() => setIsEditingTournament(false)}
          onSave={(data) => updateTournament.mutate({ id: tournamentId, ...data })}
        />
      )}
      {editingMatch && (
        <ScoreModal
          match={editingMatch}
          teams={teams}
          modality={tournament.modality}
          championshipAddresses={siteSettings?.championshipAddresses || []}
          onClose={() => setEditingMatch(null)}
          onSave={(
            matchId: number,
            home: number,
            away: number,
            time: string,
            location: string,
            voleiSets?: { home: number; away: number }[]
          ) =>
            updateScore.mutate({
              matchId,
              homeScore: home,
              awayScore: away,
              voleiSets,
              time,
              location,
            })
          }
        />
      )}

      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red"
              onClick={() => navigate(isAuthenticated ? "/admin" : "/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-red/5 flex items-center justify-center border border-red/10 shadow-sm overflow-hidden">
              <img 
                src="/logo.png" 
                alt="LEG" 
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-sm font-black text-primary leading-none uppercase tracking-tight">
                {tournament.name}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {tournament.category} • {tournament.modality}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-border/50 pl-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border hover:border-red/50 hover:text-red text-xs px-2.5"
                  onClick={() => setIsEditingTournament(true)}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-border hover:bg-red/5 hover:text-red hover:border-red/30 text-xs px-2"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tournament Header */}
      <div className="border-b border-border/40 py-10 bg-white">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-28 h-28 rounded-3xl bg-white border-2 border-red/10 shadow-xl flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src="/logo.png" 
                alt="LEG" 
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex flex-col gap-2">
                <Badge variant="secondary" className="w-fit bg-red/5 text-red border-red/10 font-bold px-3 py-1 rounded-lg uppercase tracking-wider text-[10px]">
                  {tournament.category}
                </Badge>
                <h2 className="font-display text-5xl font-black text-primary leading-none tracking-tighter">
                  {tournament.name}
                </h2>
                <div className="flex items-center gap-5 mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-red/60" /> {teams.length} equipes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-red/60" /> {matches.length} partidas
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                    {tournament.modality}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detailPills.map((pill) => (
                    <span
                      key={pill}
                      className="px-3 py-1 rounded-full border border-white/70 bg-white/65 text-[10px] font-black uppercase tracking-wider text-slate-500"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {tournament.champion && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-red/20 shadow-sm">
                <Trophy className="w-4 h-4 text-red" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Campeão</p>
                  <p className="text-sm font-bold text-primary">{tournament.champion}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      {isAuthenticated && (
        <div className="border-b border-border/40 py-3">
          <div className="container flex flex-wrap gap-2">
            {tournament.status === "pending" && !showGroupSetup && (
              <Button
                size="sm"
                className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                onClick={() => {
                  if (teams.length > 4) {
                    setShowGroupSetup(true);
                    // Inicializa assignment: metade A, metade B
                    const init: Record<number, "A" | "B"> = {};
                    teams.forEach((t, i) => { init[t.id] = i % 2 === 0 ? "A" : "B"; });
                    setManualAssignment(init);
                  } else {
                    // 4 ou menos = grupo único, gera direto
                    generateGroups.mutate({ tournamentId, mode: "auto" });
                  }
                }}
                disabled={generateGroups.isPending}
              >
                <Shuffle className="w-4 h-4 mr-1.5" />
                Sortear Confrontos
              </Button>
            )}
            {tournament.status === "group_stage" && (
              <Button
                size="sm"
                className="bg-primary text-white font-bold hover:opacity-90"
                onClick={() => generateSemis.mutate({ tournamentId })}
                disabled={generateSemis.isPending}
              >
                Gerar Semifinais
              </Button>
            )}
            {(tournament.status === "semifinals" || (usesAdvancedSeries && tournament.status === "final")) && (
              <Button
                size="sm"
                className="bg-primary text-white font-bold hover:opacity-90"
                onClick={() => generateFinal.mutate({ tournamentId })}
                disabled={generateFinal.isPending}
              >
                {usesAdvancedSeries ? "Gerar Próxima Fase" : "Gerar Final"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Group Setup Modal — escolha automático ou manual */}
      {showGroupSetup && tournament.status === "pending" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowGroupSetup(false)} />
          <div className="relative bg-white rounded-[28px] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowGroupSetup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-xl text-slate-800 mb-1 uppercase tracking-tight">Configurar Grupos</h3>
            <p className="text-xs text-slate-500 mb-6">{teams.length} equipes serão divididas em 2 grupos</p>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => setGroupMode("auto")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  groupMode === "auto"
                    ? "border-red bg-red/5 text-red"
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                }`}
              >
                <Shuffle className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-wider">Automático</span>
                <span className="text-[10px] font-medium opacity-70">Sorteio aleatório</span>
              </button>
              <button
                onClick={() => setGroupMode("manual")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  groupMode === "manual"
                    ? "border-red bg-red/5 text-red"
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                }`}
              >
                <Edit2 className="w-6 h-6" />
                <span className="text-xs font-black uppercase tracking-wider">Manual</span>
                <span className="text-[10px] font-medium opacity-70">Você define os grupos</span>
              </button>
            </div>

            {/* Manual assignment UI */}
            {groupMode === "manual" && (
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clique no grupo de cada equipe</p>
                {teams.map(t => {
                  const currentGroup = manualAssignment[t.id] || "A";
                  return (
                    <div key={t.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {t.logo ? (
                          <img src={t.logo as string} className="w-8 h-8 rounded-lg object-contain" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ backgroundColor: t.color }}>
                            {t.shortName.slice(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-bold text-slate-700">{t.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setManualAssignment(prev => ({ ...prev, [t.id]: "A" }))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            currentGroup === "A"
                              ? "bg-red text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-400 hover:border-red/40"
                          }`}
                        >
                          A
                        </button>
                        <button
                          onClick={() => setManualAssignment(prev => ({ ...prev, [t.id]: "B" }))}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            currentGroup === "B"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white border border-slate-200 text-slate-400 hover:border-blue-400"
                          }`}
                        >
                          B
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Preview dos grupos */}
                {(() => {
                  const gA = teams.filter(t => manualAssignment[t.id] === "A");
                  const gB = teams.filter(t => manualAssignment[t.id] === "B");
                  const valid = gA.length >= 2 && gB.length >= 2;
                  return (
                    <div className={`grid grid-cols-2 gap-2 mt-3 p-3 rounded-xl border ${valid ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                      <div className="text-center">
                        <span className="text-[10px] font-black text-red uppercase tracking-widest">Grupo A</span>
                        <p className="text-lg font-black text-slate-700">{gA.length}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Grupo B</span>
                        <p className="text-lg font-black text-slate-700">{gB.length}</p>
                      </div>
                      {!valid && (
                        <p className="col-span-2 text-[10px] text-red-500 font-bold text-center mt-1">Cada grupo precisa de no mínimo 2 equipes</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {groupMode === "auto" && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 text-center">
                <Shuffle className="w-8 h-8 text-red/40 mx-auto mb-2" />
                <p className="text-xs text-slate-500">As equipes serão divididas aleatoriamente em <strong>2 grupos equilibrados</strong>.</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl font-bold text-xs"
                onClick={() => setShowGroupSetup(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-[2] bg-red text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red/20 hover:opacity-90"
                disabled={generateGroups.isPending || (groupMode === "manual" && (() => {
                  const gA = teams.filter(t => manualAssignment[t.id] === "A");
                  const gB = teams.filter(t => manualAssignment[t.id] === "B");
                  return gA.length < 2 || gB.length < 2;
                })())}
                onClick={() => {
                  if (groupMode === "auto") {
                    generateGroups.mutate({ tournamentId, mode: "auto" });
                  } else {
                    const manualGroupsArr = Object.entries(manualAssignment).map(([teamId, group]) => ({
                      teamId: Number(teamId),
                      group,
                    }));
                    generateGroups.mutate({ tournamentId, mode: "manual", manualGroups: manualGroupsArr });
                  }
                  setShowGroupSetup(false);
                }}
              >
                {generateGroups.isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Shuffle className="w-4 h-4 mr-1.5" />
                    {groupMode === "auto" ? "Sortear e Gerar Jogos" : "Confirmar e Gerar Jogos"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border/40 sticky top-16 z-30 glass">
        <div className="container">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === id
                    ? "border-red text-red"
                    : "border-transparent text-slate-500 hover:text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container py-8">
        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Fase de Grupos
              </h2>
              <span className="text-sm text-muted-foreground">
                {groupMatches.filter((m) => m.status === "finished").length}/{groupMatches.length} partidas
              </span>
            </div>
            {groupMatches.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <Flag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated
                    ? 'Clique em "Sortear Confrontos" para criar os jogos'
                    : "Confrontos ainda não sorteados"}
                </p>
              </div>
            ) : (
              (() => {
                // Detecta se há múltiplos grupos pelas equipes
                const teamGroupMap = new Map(teams.map(t => [t.id, (t as any).groupName as string | null]));
                const groupNamesSet = teams.map(t => (t as any).groupName).filter((g: any): g is string => g != null);
                const uniqueGroups = groupNamesSet.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).sort();
                const hasMultipleGroups = uniqueGroups.length >= 2;

                if (!hasMultipleGroups) {
                  // Grupo único — exibe por rodada como antes
                  return (
                    <div className="space-y-12 max-w-5xl mx-auto">
                      {groupMatches.map(m => m.round).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(roundNum => (
                        <div key={roundNum}>
                          <div className="flex items-center gap-4 mb-6">
                            <div className="h-px flex-1 bg-slate-300" />
                            <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-300 shadow-sm">
                              {roundNum}ª Rodada
                            </h3>
                            <div className="h-px flex-1 bg-slate-300" />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto">
                            {groupMatches.filter(m => m.round === roundNum).map((m) => (
                              <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Múltiplos grupos — lado a lado, compacto por rodada
                const groupData = uniqueGroups.map((gName: string) => {
                  const groupTeamIds = new Set(teams.filter(t => (t as any).groupName === gName).map(t => t.id));
                  const gMatches = groupMatches.filter(m => groupTeamIds.has(m.homeTeamId) && groupTeamIds.has(m.awayTeamId));
                  const rounds = gMatches.map(m => m.round).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
                  return { gName, gMatches, rounds };
                });
                const allRounds = groupData.flatMap(g => g.rounds).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

                return (
                  <div className="space-y-6 max-w-6xl mx-auto">
                    {/* Group Headers */}
                    <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                      {groupData.map(({ gName }) => (
                        <div key={gName} className={`text-center py-2 rounded-xl border font-black text-xs uppercase tracking-[0.2em] ${
                          gName === "A" ? "bg-red/5 border-red/20 text-red" : "bg-blue-500/5 border-blue-500/20 text-blue-600"
                        }`}>
                          Grupo {gName}
                        </div>
                      ))}
                    </div>

                    {/* Rounds side by side */}
                    {allRounds.map(roundNum => (
                      <div key={roundNum}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-px flex-1 bg-slate-300" />
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-300">{roundNum}ª Rodada</span>
                          <div className="h-px flex-1 bg-slate-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                          {groupData.map(({ gName, gMatches }) => (
                            <div key={gName} className="space-y-3">
                              {gMatches.filter(m => m.round === roundNum).map((m) => (
                                <MatchCardCompact key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <div className="rounded-3xl border border-[#0A2D78]/15 bg-gradient-to-b from-[#ebf1f8] to-[#dfe9f4] p-5 md:p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Classificação
            </h2>
            {!standings || (Array.isArray(standings) && standings.length === 0) ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma partida registrada ainda</p>
              </div>
            ) : Array.isArray(standings) && standings.length > 0 && "groupName" in standings[0] ? (
              // Múltiplos grupos
              <div className="space-y-10">
                {(standings as any[]).map((g: any) => (
                  <div key={g.groupName}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-px flex-1 bg-red/20" />
                      <h3 className="text-sm font-black text-red uppercase tracking-[0.3em] bg-red/5 px-6 py-2 rounded-full border border-red/20 shadow-sm">
                        Grupo {g.groupName}
                      </h3>
                      <div className="h-px flex-1 bg-red/20" />
                    </div>
                    <StandingsTable standings={g.standings} modality={tournament.modality} />
                  </div>
                ))}
              </div>
            ) : (
              // Grupo único (flat array)
              <div className="space-y-6">
                <StandingsTable standings={standings as any[]} modality={tournament.modality} />

                {canShowFinalClassification && (
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-4">
                      Classificação final (grupo único)
                    </p>
                    <div className="space-y-2">
                      {classificationTop4.map((team, idx) => (
                        <div
                          key={team.teamId}
                          className="flex items-center justify-between rounded-xl bg-white/80 border border-amber-100 px-4 py-3"
                        >
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                            {idx === 0 ? "Campeão" : idx === 1 ? "Vice-campeão" : `${idx + 1}º lugar`}
                          </span>
                          <span className="text-sm font-black text-slate-800 uppercase">
                            {team.teamName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bracket Tab */}
        {activeTab === "bracket" && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Chaveamento
            </h2>
            {bracket ? (
              <BracketView bracket={bracket} teams={teams} />
            ) : (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <GitBranch className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Chaveamento ainda não disponível</p>
              </div>
            )}
          </div>
        )}

        {/* Semifinals Tab */}
        {activeTab === "semifinals" && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Fase Eliminatória
            </h2>
            {quarterMatches.length === 0 && semiMatches.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <Medal className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated
                    ? 'Conclua a fase de grupos e clique em "Gerar Semifinais"'
                    : "Fase eliminatória ainda não gerada"}
                </p>
              </div>
            ) : (
              <div className="space-y-8 max-w-5xl">
                {quarterMatches.length > 0 && (
                  <section>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3">Quartas de Final</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {quarterMatches
                        .sort((a, b) => a.round - b.round)
                        .map((m) => (
                          <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                        ))}
                    </div>
                  </section>
                )}

                {usesAdvancedSeries ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <section>
                      <h3 className="text-sm font-black uppercase tracking-wider text-red mb-3">Série Liga (Ouro)</h3>
                      <div className="space-y-3">
                        {handebolOuroSemi
                          .sort((a, b) => a.round - b.round)
                          .map((m) => (
                            <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                          ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 mb-3">Série Paulista (Prata)</h3>
                      <div className="space-y-3">
                        {handebolPrataSemi
                          .sort((a, b) => a.round - b.round)
                          .map((m) => (
                            <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                          ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
                    {semiMatches
                      .sort((a, b) => a.round - b.round)
                      .map((m) => (
                        <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Final Tab */}
        {activeTab === "final" && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Finais
            </h2>
            {finalMatches.length === 0 && thirdPlaceMatches.length === 0 ? (
              canShowFinalClassification ? (
                <div className="space-y-6 max-w-2xl">
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-5">
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-4">
                      Resultado final por classificação geral
                    </p>
                    <div className="space-y-2">
                      {classificationTop4.map((team, idx) => (
                        <div
                          key={team.teamId}
                          className="flex items-center justify-between rounded-xl bg-white/80 border border-emerald-100 px-4 py-3"
                        >
                          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                            {idx === 0 ? "Campeão" : idx === 1 ? "Vice-campeão" : `${idx + 1}º lugar`}
                          </span>
                          <span className="text-sm font-black text-slate-800 uppercase">
                            {team.teamName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex flex-col items-center gap-3 px-10 py-8 rounded-3xl bg-slate-50 border-2 border-red/10 shadow-xl">
                      <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mb-2">
                        <Trophy className="w-8 h-8 text-red" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">
                          Grande Campeão
                        </p>
                        <p className="font-display text-3xl font-bold text-primary">
                          {championDisplayName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                  <Star className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {isAuthenticated
                      ? 'Conclua as semifinais e clique em "Gerar Final"'
                      : "Final ainda não gerada"}
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-8 max-w-5xl">
                {usesAdvancedSeries ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <section>
                      <h3 className="text-sm font-black uppercase tracking-wider text-red mb-3">Série Liga (Ouro)</h3>
                      <div className="space-y-3">
                        {handebolOuroThird.map((m) => (
                          <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                        ))}
                        {handebolOuroFinal.map((m) => (
                          <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-600 mb-3">Série Paulista (Prata)</h3>
                      <div className="space-y-3">
                        {handebolPrataThird.map((m) => (
                          <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                        ))}
                        {handebolPrataFinal.map((m) => (
                          <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="max-w-md">
                    {finalMatches.map((m) => (
                      <MatchCard key={m.id} match={m} teams={teams} isAdmin={isAuthenticated} onEdit={setEditingMatch} />
                    ))}
                  </div>
                )}

                <div className="mt-8 text-center">
                  <div className="inline-flex flex-col items-center gap-3 px-10 py-8 rounded-3xl bg-slate-50 border-2 border-red/10 shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mb-2">
                      <Trophy className="w-8 h-8 text-red" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">
                        Grande Campeão
                      </p>
                      <p className="font-display text-3xl font-bold text-primary">
                        {championDisplayName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter
        footerLogoUrl={footerLogoUrl}
        modalities={modalitiesInOrder}
        modalityLabelByKey={modalityLabels}
        onModalityClick={(modalityKey) => navigate(`/modalidade/${modalityKey}`)}
      />
    </div>
  );
}


