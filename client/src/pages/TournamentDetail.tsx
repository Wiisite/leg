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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Tab = "groups" | "standings" | "bracket" | "semifinals" | "final";

function TeamBadge({
  color,
  short,
  name,
  size = "md",
}: {
  color: string;
  short: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizes[size]} rounded-lg flex items-center justify-center font-bold text-white shrink-0`}
        style={{ background: color }}
      >
        {short.slice(0, 3)}
      </div>
      {name && <span className="text-sm font-medium text-foreground truncate">{name}</span>}
    </div>
  );
}

type MatchForModal = { 
  id: number; 
  homeTeamId: number; 
  awayTeamId: number; 
  homeScore: number | null; 
  awayScore: number | null;
  time?: string | null;
  location?: string | null;
};

function ScoreModal({
  match,
  teams,
  onClose,
  onSave,
}: {
  match: MatchForModal;
  teams: { id: number; name: string; shortName: string; color: string }[];
  onClose: () => void;
  onSave: (matchId: number, home: number, away: number) => void;
}) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const [home, setHome] = useState(match.homeScore ?? 0);
  const [away, setAway] = useState(match.awayScore ?? 0);
  const [time, setTime] = useState(match.time ?? "");
  const [location, setLocation] = useState(match.location ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-premium">
        <h3 className="font-display font-semibold text-lg text-center mb-6">Registrar Placar</h3>
        <div className="flex items-center gap-4 justify-center mb-6">
          <div className="flex-1 text-center">
            {homeTeam && (
              <TeamBadge color={homeTeam.color} short={homeTeam.shortName} size="lg" />
            )}
            <p className="text-xs text-muted-foreground mt-2 truncate">{homeTeam?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={home}
              onChange={(e) => setHome(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 h-14 text-center text-2xl font-bold bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground font-bold">×</span>
            <input
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 h-14 text-center text-2xl font-bold bg-input border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 text-center">
            {awayTeam && (
              <TeamBadge color={awayTeam.color} short={awayTeam.shortName} size="lg" />
            )}
            <p className="text-xs text-muted-foreground mt-2 truncate">{awayTeam?.name}</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">Horário</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Ex: 14:30"
                className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 ml-1">Local</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Ginásio Municipal"
                className="w-full pl-9 pr-4 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-red text-white font-semibold hover:opacity-90 shadow-brand"
            onClick={() => onSave(match.id, home, away, time, location)}
          >
            Salvar
          </Button>
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
  match: {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    round: number;
    time?: string | null;
    location?: string | null;
  };
  teams: { id: number; name: string; shortName: string; color: string }[];
  isAdmin: boolean;
  onEdit?: (m: MatchForModal) => void;
}) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const finished = match.status === "finished";

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-all shadow-sm ${
        finished ? "border-border/40 opacity-80" : "border-border hover:border-gold/30 hover:shadow-md"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 justify-end">
          {homeTeam && (
            <>
              <span className="text-sm font-bold text-foreground text-right truncate max-w-[120px]">
                {homeTeam.name}
              </span>
              <TeamBadge color={homeTeam.color} short={homeTeam.shortName} size="sm" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {finished ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-lg font-bold text-primary w-5 text-center">
                {match.homeScore}
              </span>
              <span className="text-red/50 text-sm font-bold">–</span>
              <span className="text-lg font-bold text-primary w-5 text-center">
                {match.awayScore}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-red font-bold uppercase tracking-wider">VS</span>
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          {awayTeam && (
            <>
              <TeamBadge color={awayTeam.color} short={awayTeam.shortName} size="sm" />
              <span className="text-sm font-bold text-foreground truncate max-w-[120px]">
                {awayTeam.name}
              </span>
            </>
          )}
        </div>
      </div>
      {(match.time || match.location) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-t border-border/30 pt-2 px-1">
          {match.time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-red/60" /> {match.time}
            </span>
          )}
          {match.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red/60" /> {match.location}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          {finished ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Encerrado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" /> Aguardando
            </span>
          )}
        </div>
        {isAdmin && onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-border hover:border-red/50 hover:text-red hover:bg-red/5"
            onClick={() => onEdit(match)}
          >
            {finished ? "Editar" : "Registrar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StandingsTable({
  standings,
}: {
  standings: {
    teamId: number;
    teamName: string;
    shortName: string;
    color: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-secondary/50">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium w-8">#</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Equipe</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">J</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">V</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">E</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">D</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">GP</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">GC</th>
            <th className="text-center py-3 px-3 text-muted-foreground font-medium">SG</th>
            <th className="text-center py-3 px-4 text-red font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.teamId}
              className={`border-b border-border/30 transition-colors hover:bg-slate-50 ${
                i < 2 ? "bg-amber-50/30" : ""
              }`}
            >
              <td className="py-3 px-4">
                <span
                  className={`text-xs font-bold ${
                    i < 2 ? "text-red" : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="py-3 px-4">
                <TeamBadge color={s.color} short={s.shortName} name={s.teamName} size="sm" />
              </td>
              <td className="py-3 px-3 text-center text-slate-700 font-medium">{s.played}</td>
              <td className="py-3 px-3 text-center text-green-600 font-semibold">{s.won}</td>
              <td className="py-3 px-3 text-center text-amber-600 font-semibold">{s.drawn}</td>
              <td className="py-3 px-3 text-center text-red-600 font-semibold">{s.lost}</td>
              <td className="py-3 px-3 text-center text-slate-600">{s.goalsFor}</td>
              <td className="py-3 px-3 text-center text-slate-600">{s.goalsAgainst}</td>
              <td className="py-3 px-3 text-center text-foreground">
                {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
              </td>
              <td className="py-3 px-4 text-center">
                <span className="font-bold text-red text-base">{s.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {standings.length >= 2 && (
        <div className="px-4 py-2 border-t border-border/30 bg-amber-50/20">
          <p className="text-xs text-amber-800/70 font-medium">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-200 mr-1.5 align-middle" />
            Classificados para semifinal
          </p>
        </div>
      )}
    </div>
  );
}

function BracketView({
  bracket,
  teams,
}: {
  bracket: {
    group: { id: number; homeTeamId: number; awayTeamId: number; homeScore: number | null; awayScore: number | null; status: string; round: number }[];
    semifinal: { id: number; homeTeamId: number; awayTeamId: number; homeScore: number | null; awayScore: number | null; status: string; round: number }[];
    final: { id: number; homeTeamId: number; awayTeamId: number; homeScore: number | null; awayScore: number | null; status: string; round: number }[];
  };
  teams: { id: number; name: string; shortName: string; color: string }[];
}) {
  const getTeam = (id: number) => teams.find((t) => t.id === id);
  const getWinner = (m: { homeTeamId: number; awayTeamId: number; homeScore: number | null; awayScore: number | null; status: string }) => {
    if (m.status !== "finished") return null;
    if (m.homeScore! > m.awayScore!) return m.homeTeamId;
    if (m.awayScore! > m.homeScore!) return m.awayTeamId;
    return m.homeTeamId;
  };

  const BracketMatch = ({
    match,
    label,
  }: {
    match: typeof bracket.semifinal[0];
    label?: string;
  }) => {
    const home = getTeam(match.homeTeamId);
    const away = getTeam(match.awayTeamId);
    const winner = getWinner(match);
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden w-56 shadow-premium">
        {label && (
          <div className="px-3 py-1.5 bg-secondary/60 border-b border-border/40">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
        )}
        {[
          { team: home, score: match.homeScore, teamId: match.homeTeamId },
          { team: away, score: match.awayScore, teamId: match.awayTeamId },
        ].map(({ team, score, teamId }, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-3 py-2.5 ${
              idx === 0 ? "border-b border-border/30" : ""
            } ${winner === teamId ? "bg-amber-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              {team ? (
                <TeamBadge color={team.color} short={team.shortName} size="sm" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">?</span>
                </div>
              )}
              <span
                className={`text-sm truncate max-w-[90px] ${
                  winner === teamId ? "text-gold font-semibold" : "text-foreground"
                }`}
              >
                {team?.name ?? "A definir"}
              </span>
            </div>
            <span
              className={`text-sm font-bold ${
                winner === teamId ? "text-red" : "text-muted-foreground"
              }`}
            >
              {score ?? "-"}
            </span>
          </div>
        ))}
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

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const tournamentId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [editingMatch, setEditingMatch] = useState<null | {
    id: number;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
  }>(null);

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
        <p className="text-slate-500 max-w-sm mb-8">
          Não conseguimos carregar os dados deste torneio. Isso pode acontecer se o banco de dados estiver em manutenção.
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
      {editingMatch && (
        <ScoreModal
          match={editingMatch}
          teams={teams}
          onClose={() => setEditingMatch(null)}
          onSave={(matchId, home, away, time, location) =>
            updateScore.mutate({ matchId, homeScore: home, awayScore: away, time, location })
          }
        />
      )}

      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
              {status.label}
            </span>
            {isAuthenticated && (
              <Button
                size="sm"
                variant="outline"
                className="border-border hover:border-red/50 hover:text-red text-xs"
                onClick={() => navigate("/admin")}
              >
                <Shield className="w-3.5 h-3.5 mr-1" />
                Admin
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border hover:bg-red/5 hover:text-red hover:border-red/30 text-xs"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tournament Header */}
      <div className="border-b border-border/40 py-8">
        <div className="container">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-1">
              <img src="/logo.png" alt="Logo LEG" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-primary leading-tight">
                {tournament.name}
              </h1>
              <p className="text-muted-foreground mt-1">{tournament.category}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {teams.length} equipes
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" />
                  {matches.length} partidas
                </span>
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
                    ? 'Clique em "Gerar Fase de Grupos" para criar os confrontos'
                    : "Confrontos ainda não gerados"}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {groupMatches.map((m) => (
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

// Missing import
function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
