import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Users,
  BarChart3,
  GitBranch,
  Swords,
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
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Tab = "groups" | "standings" | "bracket" | "semifinals" | "final";

type MatchForModal = { 
  id: number; 
  homeTeamId: number; 
  awayTeamId: number; 
  homeScore: number | null; 
  awayScore: number | null;
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
  onClose,
  onSave,
}: {
  match: MatchForModal;
  teams: { id: number; name: string; shortName: string; color: string; logo?: string | null }[];
  onClose: () => void;
  onSave: (matchId: number, home: number, away: number, time: string, location: string) => void;
}) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [time, setTime] = useState(match.time ?? "");
  const [location, setLocation] = useState(match.location ?? "");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-300">
        <h3 className="font-black text-2xl text-center mb-8 text-slate-800 tracking-tight uppercase">Registrar Placar</h3>
        
        <div className="flex items-center gap-6 justify-between mb-10">
          <div className="flex-1 flex flex-col items-center gap-3">
            <TeamBadge team={homeTeam} size="lg" />
            <p className="text-[11px] font-black text-slate-400 uppercase text-center leading-tight min-h-[2.5rem] flex items-center">{homeTeam?.name}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={home}
              onChange={(e) => setHome(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 focus:outline-none focus:border-red transition-all"
            />
            <span className="text-slate-200 font-black text-xl">×</span>
            <input
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 h-16 text-center text-4xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-800 focus:outline-none focus:border-red transition-all"
            />
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
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ginásio"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-red/20 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="flex-[2] bg-red hover:bg-red-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red/20 transition-all active:scale-95"
            onClick={() => onSave(match.id, home, away, time, location)}
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
    <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-slate-100">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex-1 flex flex-col items-center gap-3">
          <TeamBadge team={home} size="md" />
          <span className="text-[11px] font-black text-slate-800 uppercase text-center leading-tight min-h-[2.5rem] flex items-center justify-center px-2">{home?.name}</span>
        </div>
        
        <div className="flex flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-4">
            <span className={`text-4xl font-black ${finished ? 'text-slate-800' : 'text-slate-200'}`}>
              {match.homeScore ?? "0"}
            </span>
            <span className="text-slate-200 font-black text-xl">×</span>
            <span className={`text-4xl font-black ${finished ? 'text-slate-800' : 'text-slate-200'}`}>
              {match.awayScore ?? "0"}
            </span>
          </div>
          <div className="px-3 py-1 bg-red/5 rounded-full border border-red/10">
            <span className="text-[9px] font-black text-red uppercase tracking-widest">VS</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center gap-3">
          <TeamBadge team={away} size="md" />
          <span className="text-[11px] font-black text-slate-800 uppercase text-center leading-tight min-h-[2.5rem] flex items-center justify-center px-2">{away?.name}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">{match.time || "A DEFINIR"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[120px]">{match.location || "A DEFINIR"}</span>
          </div>
        </div>
        
        {isAdmin && onEdit && (
          <Button 
            size="sm" 
            onClick={() => onEdit(match)}
            className="bg-slate-50 hover:bg-red hover:text-white text-slate-400 text-[10px] font-black uppercase px-6 rounded-2xl transition-all shadow-sm active:scale-95"
          >
            {finished ? "Editar" : "Registrar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StandingsTable({ standings }: { standings: any[] }) {
  return (
    <div className="overflow-x-auto rounded-[32px] border border-slate-100 shadow-sm bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="py-6 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
            <th className="py-6 px-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">J</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">V</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">E</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">D</th>
            <th className="py-6 px-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">SG</th>
            <th className="py-6 px-6 text-center text-[10px] font-black text-red uppercase tracking-widest w-20">Pts</th>
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
              <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.played}</td>
              <td className="py-5 px-3 text-center text-sm font-black text-green-600">{s.won}</td>
              <td className="py-5 px-3 text-center text-sm font-black text-amber-500">{s.drawn}</td>
              <td className="py-5 px-3 text-center text-sm font-black text-red-500">{s.lost}</td>
              <td className="py-5 px-3 text-center text-sm font-black text-slate-600">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              <td className="py-5 px-6 text-center">
                <span className="text-lg font-black text-red">{s.points}</span>
              </td>
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
  const champion = finalWinner ? getTeam(finalWinner) : null;

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
            bracket.semifinal.map((m, i) => (
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

  const { data, refetch, isLoading, error } = trpc.tournament.getById.useQuery({ id: tournamentId });
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

  const fixDb = trpc.system.fixDatabase.useMutation();

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
  const semiMatches = matches.filter((m) => m.phase === "semifinal");
  const finalMatches = matches.filter((m) => m.phase === "final");

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
    group_stage: { label: "Fase de Grupos", color: "bg-blue-50 text-blue-700" },
    semifinals: { label: "Semifinais", color: "bg-purple-50 text-purple-700" },
    final: { label: "Final", color: "bg-amber-50 text-amber-700" },
    finished: { label: "Encerrado", color: "bg-green-50 text-green-700" },
  };

  const status = STATUS_LABELS[tournament.status] ?? STATUS_LABELS.pending;

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "groups", label: "Grupos", icon: Users },
    { id: "standings", label: "Classificação", icon: BarChart3 },
    { id: "bracket", label: "Chaveamento", icon: GitBranch },
    { id: "semifinals", label: "Semifinais", icon: Swords },
    { id: "final", label: "Final", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
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
          onClose={() => setEditingMatch(null)}
          onSave={(matchId: number, home: number, away: number, time: string, location: string) =>
            updateScore.mutate({ matchId, homeScore: home, awayScore: away, time, location })
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
              onClick={() => navigate("/")}
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
      <div className="border-b border-border/40 py-10 bg-slate-50/30">
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
                    <Swords className="w-4 h-4 text-red/60" /> {matches.length} partidas
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                    {tournament.modality}
                  </span>
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
            {tournament.status === "pending" && (
              <Button
                size="sm"
                className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                onClick={() => generateGroups.mutate({ tournamentId })}
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
            {tournament.status === "semifinals" && (
              <Button
                size="sm"
                className="bg-primary text-white font-bold hover:opacity-90"
                onClick={() => generateFinal.mutate({ tournamentId })}
                disabled={generateFinal.isPending}
              >
                Gerar Final
              </Button>
            )}
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
                <Swords className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated
                    ? 'Clique em "Sortear Confrontos" para criar os jogos'
                    : "Confrontos ainda não sorteados"}
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {Array.from(new Set(groupMatches.map(m => m.round))).sort((a, b) => a - b).map(roundNum => (
                  <div key={roundNum}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-px flex-1 bg-slate-200" />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                        {roundNum}ª Rodada
                      </h3>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupMatches.filter(m => m.round === roundNum).map((m) => (
                        <MatchCard
                          key={m.id}
                          match={m}
                          teams={teams}
                          isAdmin={isAuthenticated}
                          onEdit={setEditingMatch}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Standings Tab */}
        {activeTab === "standings" && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Classificação
            </h2>
            {!standings || standings.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma partida registrada ainda</p>
              </div>
            ) : (
              <StandingsTable standings={standings} />
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
              Semifinais
            </h2>
            {semiMatches.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <Swords className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated
                    ? 'Conclua a fase de grupos e clique em "Gerar Semifinais"'
                    : "Semifinais ainda não geradas"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
                {semiMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    teams={teams}
                    isAdmin={isAuthenticated}
                    onEdit={setEditingMatch}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Final Tab */}
        {activeTab === "final" && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-6">
              Grande Final
            </h2>
            {finalMatches.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <Star className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isAuthenticated
                    ? 'Conclua as semifinais e clique em "Gerar Final"'
                    : "Final ainda não gerada"}
                </p>
              </div>
            ) : (
              <div className="max-w-md">
                {finalMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    teams={teams}
                    isAdmin={isAuthenticated}
                    onEdit={setEditingMatch}
                  />
                ))}
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
                        {tournament.champion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


