import { useState, useEffect } from "react";
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
  AlertCircle,
  Image,
  Save,
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
            {user?.openId === "admin-master" && (
              <button 
                onClick={() => setView("site")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === "site" ? "bg-white shadow-sm text-red" : "text-slate-500 hover:text-slate-700"}`}
              >
                Site
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

        {view === "tournaments" && (
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
        )}

        {view === "staff" && user?.openId === "admin-master" && (
          <StaffSection />
        )}

        {view === "site" && user?.openId === "admin-master" && (
          <SiteSettingsSection />
        )}

        {view === "profile" && (
          <ProfileSection />
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

function SiteSettingsSection() {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();

  const [mainLogoUrl, setMainLogoUrl] = useState("");
  const [footerLogoUrl, setFooterLogoUrl] = useState("");
  const [partners, setPartners] = useState<{ name: string; logoUrl: string }[]>([]);

  useEffect(() => {
    if (!settings) return;
    setMainLogoUrl(settings.mainLogoUrl || "");
    setFooterLogoUrl(settings.footerLogoUrl || "");
    setPartners(settings.partners || []);
  }, [settings]);

  const updateMutation = trpc.site.updateSettings.useMutation({
    onSuccess: () => {
      utils.site.getSettings.invalidate();
      toast.success("Configurações do site atualizadas!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePartner = (index: number, patch: { name?: string; logoUrl?: string }) => {
    setPartners((prev) =>
      prev.map((partner, i) =>
        i === index
          ? {
              ...partner,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
            }
          : partner
      )
    );
  };

  const addPartner = () => {
    setPartners((prev) => [...prev, { name: "", logoUrl: "" }]);
  };

  const removePartner = (index: number) => {
    setPartners((prev) => prev.filter((_, i) => i !== index));
  };

  const saveSettings = () => {
    const cleanPartners = partners
      .map((p) => ({ name: p.name.trim(), logoUrl: p.logoUrl.trim() }))
      .filter((p) => p.name.length > 0 && p.logoUrl.length > 0);

    updateMutation.mutate({
      mainLogoUrl,
      footerLogoUrl,
      partners: cleanPartners,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Configurações do Site</h2>
          <p className="text-sm text-muted-foreground">Gerencie logo principal, logo do rodapé e parceiros exibidos na Home.</p>
        </div>
        <Button className="bg-red text-white font-bold" onClick={saveSettings} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-1.5" />
          Salvar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Logo Principal (Header)</label>
          <input
            value={mainLogoUrl}
            onChange={(e) => setMainLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-sm"
          />
          <div className="h-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
            {mainLogoUrl ? (
              <img src={mainLogoUrl} alt="Logo principal" className="max-h-16 max-w-full object-contain" />
            ) : (
              <Image className="w-6 h-6 text-slate-300" />
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Logo do Rodapé</label>
          <input
            value={footerLogoUrl}
            onChange={(e) => setFooterLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl h-11 px-3 text-sm"
          />
          <div className="h-20 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
            {footerLogoUrl ? (
              <img src={footerLogoUrl} alt="Logo do rodapé" className="max-h-16 max-w-full object-contain" />
            ) : (
              <Image className="w-6 h-6 text-slate-300" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-slate-900">Parceiros</h3>
          <Button size="sm" variant="outline" onClick={addPartner}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar parceiro
          </Button>
        </div>

        {partners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Nenhum parceiro cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end rounded-xl border border-slate-100 p-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nome</label>
                  <input
                    value={partner.name}
                    onChange={(e) => updatePartner(index, { name: e.target.value })}
                    placeholder="Ex: APEFI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Logo URL</label>
                  <input
                    value={partner.logoUrl}
                    onChange={(e) => updatePartner(index, { logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg h-10 px-3 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-red hover:bg-red/5"
                  onClick={() => removePartner(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");

  // Sincroniza o estado quando o usuário carrega ou muda
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setUsername(user.username || "");
    }
  }, [user]);
  
  const updateMutation = trpc.auth.updateMe.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("Perfil atualizado com sucesso!");
      setPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const isMaster = user?.openId === "admin-master";

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Lado Esquerdo: Info Resumo */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 text-center shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-red" />
            <div className="w-24 h-24 rounded-3xl bg-slate-100 mx-auto mb-4 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform duration-500">
              <Users className="w-12 h-12" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900 line-clamp-1">{user?.name}</h3>
            <p className="text-sm text-slate-500 mb-6">@{user?.username || "admin"}</p>
            
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-red/10 text-red text-[10px] font-black uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                {isMaster ? "Administrador Master" : "Equipe Administrativa"}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Último Acesso</span>
            </div>
            <div className="text-sm font-bold text-slate-700">
              {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("pt-BR") : "Agora"}
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[32px] p-8 md:p-10 shadow-premium relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">Configurações da Conta</h2>
              <p className="text-xs text-slate-500">Mantenha seus dados de acesso sempre atualizados.</p>
            </div>
          </div>

          <div className="grid gap-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome Completo</label>
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-900 focus:ring-4 focus:ring-red/10 transition-all placeholder:text-slate-300"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail Profissional</label>
                <input 
                  className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-900 focus:ring-4 focus:ring-red/10 transition-all placeholder:text-slate-300"
                  placeholder="exemplo@ligaleg.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome de Usuário</label>
                <div className="relative group">
                  <input 
                    className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-900 focus:ring-4 focus:ring-red/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isMaster}
                  />
                  {isMaster && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-lg font-bold">Bloqueado</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nova Senha</label>
                <input 
                  type="password"
                  className="w-full bg-slate-50 border-none rounded-2xl h-14 px-5 font-bold text-slate-900 focus:ring-4 focus:ring-red/10 transition-all placeholder:text-slate-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                className="w-full h-16 bg-red text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red/20 active:translate-y-1 transition-all"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ 
                  name,
                  email,
                  username: isMaster ? undefined : username,
                  ...(password ? { password } : {}) 
                })}
              >
                {updateMutation.isPending ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  "Salvar Alterações do Perfil"
                )}
              </Button>
            </div>
          </div>
          
          <div className="mt-10 flex items-start gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-100/50">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              <strong>Importante:</strong> Suas credenciais são de uso pessoal e intransferível. Qualquer ação realizada com seu usuário será registrada nos logs de auditoria da plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
