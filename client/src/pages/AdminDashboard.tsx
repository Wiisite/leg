import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Shield,
  Users,
  Swords,
  CheckCircle2,
  Clock,
  ChevronRight,
  LogOut,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-50 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-purple-50 text-purple-700" },
  final: { label: "Final", color: "bg-amber-50 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-green-50 text-green-700" },
};

export default function AdminDashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState("tournaments");

  const { data: tournaments, refetch } = trpc.tournament.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();
  const deleteMutation = trpc.tournament.delete.useMutation({
    onSuccess: () => {
      utils.tournament.list.invalidate();
      toast.success("Torneio excluído permanentemente.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir permanentemente o torneio "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate({ tournamentId: id });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Shield className="w-8 h-8 text-amber-950" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            O painel administrativo requer autenticação. Faça login para gerenciar torneios,
            registrar placares e controlar as fases.
          </p>
          <Button
            className="w-full gradient-gold text-amber-950 font-semibold hover:opacity-90 shadow-gold"
            onClick={() => (window.location.href = "/login")}
          >
            Acessar Sistema
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const totalMatches = tournaments?.reduce((acc) => acc, 0) ?? 0;
  const activeTournaments = tournaments?.filter(
    (t) => t.status !== "pending" && t.status !== "finished"
  ).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Início
            </Button>
            <div className="w-px h-5 bg-white/20" />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red" />
              <span className="font-bold text-sm text-white">Painel Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button
              size="sm"
              variant="outline"
              className="border-border/60 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => logout()}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Bem-vindo, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground">
              Gerencie torneios e a equipe da plataforma.
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl self-start overflow-x-auto max-w-full">
            <button 
              onClick={() => setView("tournaments")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === "tournaments" ? "bg-white shadow-sm text-red" : "text-slate-500 hover:text-slate-700"}`}
            >
              Torneios
            </button>
            {user?.openId === "admin-master" && (
              <button 
                onClick={() => setView("staff")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === "staff" ? "bg-white shadow-sm text-red" : "text-slate-500 hover:text-slate-700"}`}
              >
                Equipe
              </button>
            )}
            <button 
              onClick={() => setView("profile")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === "profile" ? "bg-white shadow-sm text-red" : "text-slate-500 hover:text-slate-700"}`}
            >
              Perfil
            </button>
          </div>
        </div>

        {view === "tournaments" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
              {[
                {
                  icon: Trophy,
                  label: "Total de Torneios",
                  value: tournaments?.length ?? 0,
                  color: "text-red",
                },
                {
                  icon: Swords,
                  label: "Em Andamento",
                  value: activeTournaments,
                  color: "text-blue-600",
                },
                {
                  icon: CheckCircle2,
                  label: "Encerrados",
                  value: tournaments?.filter((t) => t.status === "finished").length ?? 0,
                  color: "text-green-600",
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div
                  key={label}
                  className="bg-card border border-border/50 rounded-2xl p-5 shadow-premium hover:border-red/20 transition-colors"
                >
                  <Icon className={`w-5 h-5 ${color} mb-3`} />
                  <div className="text-2xl font-display font-bold text-foreground mb-1">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Torneios</h2>
              <Button
                size="sm"
                className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                onClick={() => navigate("/create")}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Novo Torneio
              </Button>
            </div>

            {/* Tournament List */}
            {!tournaments || tournaments.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl">
                <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">Nenhum torneio criado ainda</p>
                <Button
                  size="sm"
                  className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                  onClick={() => navigate("/create")}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Torneio
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((t) => {
                  const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                  return (
                    <div
                      key={t.id}
                      className="bg-card border border-border/50 rounded-2xl p-5 shadow-premium hover:border-gold/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red flex items-center justify-center shadow-brand">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-foreground mb-1">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mb-4">{t.category}</p>
                      {t.champion && (
                        <div className="flex items-center gap-1.5 text-xs text-red mb-3 font-bold">
                          <Trophy className="w-3 h-3 text-red" />
                          {t.champion}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-primary text-white font-bold hover:opacity-90 text-xs"
                          onClick={() => navigate(`/tournament/${t.id}`)}
                        >
                          Gerenciar
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border hover:bg-red/5 hover:text-red hover:border-red/30"
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <StaffSection />
        )}
      </main>
    </div>
  );
}

function StaffSection() {
  const { data: staff, refetch } = trpc.staff.list.useQuery();
  const utils = trpc.useUtils();
  
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createMutation = trpc.staff.create.useMutation({
    onSuccess: () => {
      utils.staff.list.invalidate();
      setName("");
      setUsername("");
      setPassword("");
      setShowForm(false);
      toast.success("Membro da equipe adicionado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.staff.delete.useMutation({
    onSuccess: () => {
      utils.staff.list.invalidate();
      toast.success("Membro removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">Equipe Administrativa</h2>
        <Button 
          size="sm" 
          className="bg-red text-white font-bold"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancelar" : "Adicionar Membro"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Nome</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-sm"
                placeholder="Ex: Marcello"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Usuário</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-sm"
                placeholder="Ex: marcello"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">Senha</label>
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-sm"
                type="password"
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button 
            className="w-full bg-slate-900 text-white font-bold"
            disabled={!name || !username || !password || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, username, password })}
          >
            Confirmar Cadastro
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {staff?.map((s) => (
          <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">{s.name}</div>
                <div className="text-xs text-slate-500">@{s.username || "admin"} • {s.loginMethod}</div>
              </div>
            </div>
            {s.openId !== "admin-master" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-red hover:bg-red/5"
                onClick={() => {
                  if(confirm("Remover este membro da equipe?")) deleteMutation.mutate({ id: s.id });
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  
  const updateMutation = trpc.auth.updateMe.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      setPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-semibold text-foreground mb-6">Meu Perfil</h2>
      <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nome de Exibição</label>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 font-medium"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nova Senha</label>
          <input 
            type="password"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 font-medium"
            placeholder="Deixe em branco para não alterar"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button 
          className="w-full h-12 bg-red text-white font-bold rounded-xl"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate({ 
            name, 
            ...(password ? { password } : {}) 
          })}
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
      
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Atenção:</strong> Suas credenciais são pessoais. Evite compartilhar sua senha com outros membros da equipe para manter a integridade das ações no sistema.
        </p>
      </div>
    </div>
  );
}
