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
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
  Bell,
  Menu,
  X,
  Mail,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: tournaments } = trpc.tournament.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: messages } = trpc.contact.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const unreadMessages = messages?.filter(m => m.status === "new").length ?? 0;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-red/20 border-t-red animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-xl border border-slate-100 flex items-center justify-center mx-auto mb-8">
            <Shield className="w-10 h-10 text-red" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tight">Acesso Restrito</h1>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
            O painel administrativo da LEG requer autenticação. Faça login para gerenciar o campeonato.
          </p>
          <Button
            className="w-full h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand hover:opacity-90"
            onClick={() => (window.location.href = "/login")}
          >
            Acessar Sistema
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-4 text-slate-400 font-bold hover:text-slate-600"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao site
          </Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: "tournaments", label: "Torneios", icon: Trophy },
    { id: "messages", label: "Mensagens", icon: MessageSquare, badge: unreadMessages },
    ...(user?.openId === "admin-master" ? [
      { id: "staff", label: "Equipe", icon: Users },
      { id: "site", label: "Site", icon: Settings },
    ] : []),
    { id: "profile", label: "Meu Perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden">
      {/* Sidebar - WordPress Style */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col z-50 shrink-0 shadow-2xl relative`}
      >
        {/* Brand */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-red flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-black text-white text-lg tracking-tighter uppercase">Painel <span className="text-red">LEG</span></span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative ${
                view === item.id 
                  ? "bg-red text-white font-bold" 
                  : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${view === item.id ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
              {sidebarOpen && <span className="text-sm truncate">{item.label}</span>}
              {item.badge ? (
                <span className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  view === item.id ? "bg-white text-red" : "bg-red text-white shadow-lg"
                }`}>
                  {item.badge}
                </span>
              ) : null}
              {!sidebarOpen && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl z-50">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red/10 hover:text-red transition-all group text-slate-400"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="text-sm font-bold">Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 lg:flex hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Site</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-sm font-black text-slate-900 leading-none mb-1">{user?.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {user?.openId === "admin-master" ? "Admin Master" : "Staff"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <User className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {view === "tournaments" && <TournamentsSection tournaments={tournaments || []} navigate={navigate} />}
                {view === "messages" && <MessagesSection />}
                {view === "staff" && user?.openId === "admin-master" && <StaffSection />}
                {view === "site" && user?.openId === "admin-master" && <SiteSettingsSection />}
                {view === "profile" && <ProfileSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function TournamentsSection({ tournaments, navigate }: { tournaments: any[], navigate: any }) {
  const activeTournaments = tournaments.filter(t => t.status !== "pending" && t.status !== "finished").length;
  const utils = trpc.useUtils();
  const deleteMutation = trpc.tournament.delete.useMutation({
    onSuccess: () => {
      utils.tournament.list.invalidate();
      toast.success("Torneio excluído permanentemente.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Excluir permanentemente o torneio "${name}"?`)) {
      deleteMutation.mutate({ tournamentId: id });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Campeonatos</h2>
          <p className="text-slate-500 font-medium">Gerencie as modalidades, tabelas e placares da LEG 2026.</p>
        </div>
        <Button
          className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand hover:opacity-90 px-8"
          onClick={() => navigate("/create")}
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Torneio
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-red/5 flex items-center justify-center text-red">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{tournaments.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Criados</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Swords className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{activeTournaments}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Em Andamento</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">{tournaments.filter(t => t.status === "finished").length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Encerrados</div>
          </div>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-white py-20 rounded-[40px] border border-dashed border-slate-200 text-center">
          <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest mb-6">Nenhum torneio cadastrado</p>
          <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest h-12" onClick={() => navigate("/create")}>Começar Agora</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => {
            const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
            return (
              <div key={t.id} className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:border-red/20 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{t.name}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{t.category}</p>
                
                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <Button
                    className="flex-1 h-12 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800"
                    onClick={() => navigate(`/tournament/${t.id}`)}
                  >
                    Gerenciar
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-12 h-12 p-0 rounded-xl text-slate-300 hover:text-red hover:bg-red/5"
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessagesSection() {
  const utils = trpc.useUtils();
  const { data: messages, isLoading } = trpc.contact.list.useQuery();
  const statusMutation = trpc.contact.updateStatus.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message)
  });

  if (isLoading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl" />)}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Mensagens Recebidas</h2>
        <p className="text-slate-500 font-medium">Contatos realizados através do formulário do site.</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Remetente</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Departamento</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {messages?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhuma mensagem ainda</td></tr>
              ) : messages?.map((m) => (
                <tr key={m.id} className={`group hover:bg-slate-50/30 transition-colors ${m.status === 'new' ? 'bg-blue-50/20' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.status === 'new' ? 'bg-red/10 text-red' : 'bg-slate-100 text-slate-400'}`}>
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 leading-none mb-1">{m.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">
                      {m.department || 'Geral'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                    {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="font-bold text-xs"
                        onClick={() => {
                          alert(`MENSAGEM DE: ${m.name}\n\n${m.message}`);
                          if (m.status === 'new') statusMutation.mutate({ id: m.id, status: 'read' });
                        }}
                      >
                        Ler
                      </Button>
                      {m.status !== 'archived' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-slate-400 hover:text-red hover:bg-red/5 font-bold text-xs"
                          onClick={() => statusMutation.mutate({ id: m.id, status: 'archived' })}
                        >
                          Arquivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StaffSection() {
  const { data: staff } = trpc.staff.list.useQuery();
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Equipe Administrativa</h2>
          <p className="text-slate-500 font-medium">Gerencie quem tem acesso ao painel de controle.</p>
        </div>
        <Button 
          className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand hover:opacity-90 px-8"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancelar" : "Adicionar Membro"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-3 mb-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                placeholder="Ex: Marcello Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Usuário</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                placeholder="Ex: marcello"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Senha Temporária</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                type="password"
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button 
            className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg"
            disabled={!name || !username || !password || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, username, password })}
          >
            Cadastrar Novo Acesso
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {staff?.map((s) => (
          <div key={s.id} className="bg-white border border-slate-100 rounded-3xl p-6 flex items-center justify-between shadow-sm hover:border-slate-200 transition-all group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-red/5 group-hover:text-red transition-all">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900 leading-none mb-1.5">{s.name}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  @{s.username || "admin"} • {s.loginMethod}
                </div>
              </div>
            </div>
            {s.openId !== "admin-master" && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-12 h-12 rounded-xl text-slate-300 hover:text-red hover:bg-red/5"
                onClick={() => {
                  if(confirm("Remover este acesso?")) deleteMutation.mutate({ id: s.id });
                }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SiteSettingsSection() {
  const modalities = ["futsal", "basquete", "volei", "handebol"] as const;
  type ModalityKey = (typeof modalities)[number];
  const modalityLabels: Record<ModalityKey, string> = {
    futsal: "Futsal",
    basquete: "Basquete",
    volei: "Vôlei",
    handebol: "Handebol",
  };
  const emptyModalityMap: Record<ModalityKey, string> = {
    futsal: "",
    basquete: "",
    volei: "",
    handebol: "",
  };

  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();

  const [mainLogoUrl, setMainLogoUrl] = useState("");
  const [mainLogoFileDataUrl, setMainLogoFileDataUrl] = useState<string | undefined>(undefined);
  const [footerLogoUrl, setFooterLogoUrl] = useState("");
  const [footerLogoFileDataUrl, setFooterLogoFileDataUrl] = useState<string | undefined>(undefined);
  const [homeHighlightImageUrl, setHomeHighlightImageUrl] = useState("");
  const [homeHighlightImageFileDataUrl, setHomeHighlightImageFileDataUrl] = useState<string | undefined>(undefined);
  const [homeHeroImages, setHomeHeroImages] = useState<Record<ModalityKey, string>>(emptyModalityMap);
  const [homeHeroTitles, setHomeHeroTitles] = useState<Record<ModalityKey, string>>(emptyModalityMap);
  const [homeHeroImageFiles, setHomeHeroImageFiles] = useState<Partial<Record<ModalityKey, string>>>({});
  const [modalityBannerImages, setModalityBannerImages] = useState<Record<ModalityKey, string>>(emptyModalityMap);
  const [modalityBannerImageFiles, setModalityBannerImageFiles] = useState<Partial<Record<ModalityKey, string>>>({});
  const [partners, setPartners] = useState<{ name: string; logoUrl: string; logoFileDataUrl?: string }[]>([]);
  const [liveStreams, setLiveStreams] = useState<{ title: string; youtubeUrl: string }[]>([]);
  const [championshipAddresses, setChampionshipAddresses] = useState<string[]>([]);

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler imagem"));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    if (!settings) return;
    setMainLogoUrl(settings.mainLogoUrl || "");
    setMainLogoFileDataUrl(undefined);
    setFooterLogoUrl(settings.footerLogoUrl || "");
    setFooterLogoFileDataUrl(undefined);
    setHomeHighlightImageUrl(settings.homeHighlightImageUrl || "");
    setHomeHighlightImageFileDataUrl(undefined);
    setHomeHeroImages({
      futsal: settings.homeHeroImages?.futsal || "",
      basquete: settings.homeHeroImages?.basquete || "",
      volei: settings.homeHeroImages?.volei || "",
      handebol: settings.homeHeroImages?.handebol || "",
    });
    setHomeHeroTitles({
      futsal: settings.homeHeroTitles?.futsal || modalityLabels.futsal,
      basquete: settings.homeHeroTitles?.basquete || modalityLabels.basquete,
      volei: settings.homeHeroTitles?.volei || modalityLabels.volei,
      handebol: settings.homeHeroTitles?.handebol || modalityLabels.handebol,
    });
    setHomeHeroImageFiles({});
    setModalityBannerImages({
      futsal: settings.modalityBannerImages?.futsal || "",
      basquete: settings.modalityBannerImages?.basquete || "",
      volei: settings.modalityBannerImages?.volei || "",
      handebol: settings.modalityBannerImages?.handebol || "",
    });
    setModalityBannerImageFiles({});
    setPartners((settings.partners || []).map((p) => ({ name: p.name, logoUrl: p.logoUrl })));
    setLiveStreams((settings.liveStreams || []).map((stream) => ({ title: stream.title, youtubeUrl: stream.youtubeUrl })));
    setChampionshipAddresses((settings.championshipAddresses || []).map((address) => address.trim()).filter((address) => address.length > 0));
  }, [settings]);

  const updateMutation = trpc.site.updateSettings.useMutation({
    onSuccess: () => {
      utils.site.getSettings.invalidate();
      toast.success("Configurações do site atualizadas!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePartner = (index: number, patch: { name?: string; logoUrl?: string; logoFileDataUrl?: string }) => {
    setPartners((prev) =>
      prev.map((partner, i) =>
        i === index
          ? {
              ...partner,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
              ...(patch.logoFileDataUrl !== undefined ? { logoFileDataUrl: patch.logoFileDataUrl } : {}),
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

  const updateLiveStream = (index: number, patch: { title?: string; youtubeUrl?: string }) => {
    setLiveStreams((prev) =>
      prev.map((stream, i) =>
        i === index
          ? {
              ...stream,
              ...(patch.title !== undefined ? { title: patch.title } : {}),
              ...(patch.youtubeUrl !== undefined ? { youtubeUrl: patch.youtubeUrl } : {}),
            }
          : stream
      )
    );
  };

  const addLiveStream = () => {
    setLiveStreams((prev) => [...prev, { title: "", youtubeUrl: "" }]);
  };

  const removeLiveStream = (index: number) => {
    setLiveStreams((prev) => prev.filter((_, i) => i !== index));
  };

  const updateChampionshipAddress = (index: number, value: string) => {
    setChampionshipAddresses((prev) => prev.map((address, i) => (i === index ? value : address)));
  };

  const addChampionshipAddress = () => {
    setChampionshipAddresses((prev) => [...prev, ""]);
  };

  const removeChampionshipAddress = (index: number) => {
    setChampionshipAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  const normalizeModalityMap = (map: Record<ModalityKey, string>) =>
    modalities.reduce((acc, key) => {
      acc[key] = map[key].trim();
      return acc;
    }, {} as Record<ModalityKey, string>);

  const saveSettings = () => {
    const cleanPartners = partners
      .map((p) => ({
        name: p.name.trim(),
        logoUrl: p.logoUrl.trim(),
        logoFileDataUrl: p.logoFileDataUrl,
      }))
      .filter((p) => p.name.length > 0 && (p.logoUrl.length > 0 || !!p.logoFileDataUrl));

    const cleanLiveStreams = liveStreams
      .map((stream) => ({
        title: stream.title.trim(),
        youtubeUrl: stream.youtubeUrl.trim(),
      }))
      .filter((stream) => stream.title.length > 0 && stream.youtubeUrl.length > 0);

    const cleanChampionshipAddresses = championshipAddresses
      .map((address) => address.trim())
      .filter((address, index, arr) => address.length > 0 && arr.indexOf(address) === index);

    updateMutation.mutate({
      mainLogoUrl,
      footerLogoUrl,
      homeHighlightImageUrl,
      homeHeroImages: normalizeModalityMap(homeHeroImages),
      homeHeroTitles: normalizeModalityMap(homeHeroTitles),
      modalityBannerImages: normalizeModalityMap(modalityBannerImages),
      ...(mainLogoFileDataUrl ? { mainLogoFileDataUrl } : {}),
      ...(footerLogoFileDataUrl ? { footerLogoFileDataUrl } : {}),
      ...(homeHighlightImageFileDataUrl ? { homeHighlightImageFileDataUrl } : {}),
      ...(Object.keys(homeHeroImageFiles).length > 0 ? { homeHeroImageFiles } : {}),
      ...(Object.keys(modalityBannerImageFiles).length > 0 ? { modalityBannerImageFiles } : {}),
      partners: cleanPartners,
      liveStreams: cleanLiveStreams,
      championshipAddresses: cleanChampionshipAddresses,
    });
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Aparência do Site</h2>
          <p className="text-slate-500 font-medium">Personalize logos, banners e parceiros exibidos no portal.</p>
        </div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand hover:opacity-90 px-10" onClick={saveSettings} disabled={updateMutation.isPending}>
          <Save className="w-5 h-5 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-6 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logo Principal (Header)</label>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setMainLogoFileDataUrl(await toDataUrl(file));
                } catch {
                  toast.error("Erro ao carregar imagem.");
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-4 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-slate-50 file:font-black file:uppercase file:tracking-widest file:text-slate-700 hover:file:bg-slate-100 transition-all cursor-pointer"
            />
            <input
              value={mainLogoUrl}
              onChange={(e) => setMainLogoUrl(e.target.value)}
              placeholder="Ou cole a URL da imagem aqui..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
            />
            <div className="h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-4">
              {mainLogoFileDataUrl || mainLogoUrl ? (
                <img src={mainLogoFileDataUrl || mainLogoUrl} alt="Preview" className="max-h-full max-w-full object-contain drop-shadow-md" />
              ) : (
                <Image className="w-8 h-8 text-slate-200" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-6 shadow-sm">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Logo do Rodapé</label>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setFooterLogoFileDataUrl(await toDataUrl(file));
                } catch {
                  toast.error("Erro ao carregar imagem.");
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-4 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-slate-50 file:font-black file:uppercase file:tracking-widest file:text-slate-700 hover:file:bg-slate-100 transition-all cursor-pointer"
            />
            <input
              value={footerLogoUrl}
              onChange={(e) => setFooterLogoUrl(e.target.value)}
              placeholder="Ou cole a URL da imagem aqui..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
            />
            <div className="h-32 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-4">
              {footerLogoFileDataUrl || footerLogoUrl ? (
                <img src={footerLogoFileDataUrl || footerLogoUrl} alt="Preview" className="max-h-full max-w-full object-contain drop-shadow-md" />
              ) : (
                <Image className="w-8 h-8 text-slate-200" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 p-8 space-y-6 shadow-sm">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Imagem de Destaque da Home</label>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setHomeHighlightImageFileDataUrl(await toDataUrl(file));
                } catch {
                  toast.error("Erro.");
                }
              }}
              className="w-full text-xs text-slate-500 file:mr-4 file:px-4 file:py-2.5 file:rounded-xl file:border-0 file:bg-slate-50 file:font-black file:uppercase file:tracking-widest file:text-slate-700 hover:file:bg-slate-100 transition-all cursor-pointer"
            />
            <input
              value={homeHighlightImageUrl}
              onChange={(e) => setHomeHighlightImageUrl(e.target.value)}
              placeholder="URL da imagem de destaque..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
            />
          </div>
          <div className="h-44 rounded-[32px] border border-dashed border-slate-200 bg-slate-50/50 overflow-hidden flex items-center justify-center group relative">
            {homeHighlightImageFileDataUrl || homeHighlightImageUrl ? (
              <img src={homeHighlightImageFileDataUrl || homeHighlightImageUrl} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <Image className="w-10 h-10 text-slate-200" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-12 shadow-sm space-y-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Slider Principal (Home)</h3>
          <p className="text-sm text-slate-500 font-medium">Configure as imagens e títulos para cada modalidade no topo da página inicial.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {modalities.map((modality) => (
            <div key={`hhero-${modality}`} className="rounded-[32px] border border-slate-100 p-6 space-y-4 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-red ml-1">{modalityLabels[modality]}</label>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Botão: /modalidade/{modality}</div>
              </div>
              <input
                value={homeHeroTitles[modality]}
                onChange={(e) => setHomeHeroTitles(prev => ({ ...prev, [modality]: e.target.value }))}
                placeholder="Título impactante..."
                className="w-full bg-white border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
              />
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await toDataUrl(file);
                    setHomeHeroImageFiles(prev => ({ ...prev, [modality]: dataUrl }));
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-white file:font-bold file:text-slate-700 cursor-pointer"
                />
                <div className="h-28 rounded-2xl border border-dashed border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                  {homeHeroImageFiles[modality] || homeHeroImages[modality] ? (
                    <img src={homeHeroImageFiles[modality] || homeHeroImages[modality]} className="h-full w-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-slate-100" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar mais seções conforme necessário: Parceiros, Ao Vivo, Endereços... */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white text-center">
        <Bell className="w-10 h-10 text-red mx-auto mb-4" />
        <h4 className="text-xl font-black uppercase tracking-widest mb-2">Dica Pro</h4>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">Sempre use imagens horizontais de alta resolução para os banners principais (recomendado: 1920x800px).</p>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateMutation = trpc.auth.updateMe.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado! Saia e entre novamente para aplicar todas as mudanças.");
      setPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e.message)
  });

  const handleUpdate = () => {
    if (password && password !== confirmPassword) {
      return toast.error("As senhas não coincidem");
    }
    updateMutation.mutate({ name, email, username, password: password || undefined });
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Meu Perfil</h2>
        <p className="text-slate-500 font-medium">Gerencie suas informações de acesso e dados pessoais.</p>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-12 shadow-sm space-y-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-red pl-4">Dados Pessoais</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome de Exibição</label>
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail de Contato</label>
                <input 
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-red pl-4">Acesso ao Sistema</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome de Usuário (Login)</label>
                <input 
                  value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nova Senha</label>
                  <input 
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirmar Senha</label>
                  <input 
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm outline-none focus:ring-2 focus:ring-red/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50">
          <Button 
            className="h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl px-12 hover:bg-slate-800 transition-all"
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            Atualizar Meus Dados
          </Button>
        </div>
      </div>
    </div>
  );
}
