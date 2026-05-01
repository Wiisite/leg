import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Shield,
  Users,
  Swords,
  MessageSquare,
  LogOut,
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Settings,
  User,
  Menu,
  X,
  Upload,
  MinusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
    { id: "modalities", label: "Modalidades", icon: Swords },
    { id: "messages", label: "Mensagens", icon: MessageSquare, badge: unreadMessages },
    ...(user?.openId === "admin-master" ? [
      { id: "staff", label: "Equipe", icon: Users },
      { id: "site", label: "Site", icon: Settings },
    ] : []),
    { id: "profile", label: "Meu Perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden">
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-[#1e293b] text-slate-300 transition-all duration-300 flex flex-col z-50 shrink-0 shadow-2xl relative`}
      >
        <div className="h-20 flex items-center px-6 gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-red flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-black text-white text-lg tracking-tighter uppercase">Painel <span className="text-red">LEG</span></span>
          )}
        </div>

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
            </button>
          ))}
        </nav>

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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 lg:flex hidden">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Site</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2 text-right">
              <span className="text-sm font-black text-slate-900 leading-none mb-1">{user?.name}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.openId}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400"><User className="w-6 h-6" /></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {view === "tournaments" && <TournamentsSection tournaments={tournaments || []} navigate={navigate} />}
                {view === "modalities" && <ModalitiesManagerSection />}
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

// ─── Sections ──────────────────────────────────────────────────────────────────

function TournamentsSection({ tournaments, navigate }: { tournaments: any[], navigate: any }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Campeonatos</h2>
          <p className="text-slate-500 font-medium">Gerencie as modalidades, tabelas e placares.</p>
        </div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand hover:opacity-90 px-8" onClick={() => navigate("/create")}>
          <Plus className="w-5 h-5 mr-2" /> Novo Torneio
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div key={t.id} className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20"><Trophy className="w-6 h-6 text-white" /></div>
            <h3 className="text-xl font-black text-slate-900 mb-1">{t.name}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t.category}</p>
            <div className="flex gap-3"><Button className="flex-1 h-12 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800" onClick={() => navigate(`/tournament/${t.id}`)}>Gerenciar</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalitiesManagerSection() {
  const modalities = ["futsal", "basquete", "volei", "handebol", "extra1", "extra2"] as const;
  const labels: Record<string, string> = { futsal: "Futsal", basquete: "Basquete", volei: "Vôlei", handebol: "Handebol" };
  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();
  const [modalityBannerImages, setModalityBannerImages] = useState<Record<string, string>>({});
  const [bannerFiles, setBannerFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings?.modalityBannerImages) setModalityBannerImages(settings.modalityBannerImages);
  }, [settings]);

  const updateMutation = trpc.site.updateSettings.useMutation({
    onSuccess: () => { utils.site.getSettings.invalidate(); toast.success("Banners das modalidades atualizados!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ modalityBannerImages, modalityBannerImageFiles: bannerFiles });
  };

  const toDataUrl = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
      };
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Banners de Modalidade</h2>
          <p className="text-slate-500 font-medium">Altere os banners exibidos no final de cada página de esporte.</p>
        </div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand px-10" onClick={handleSave}>Salvar</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {modalities.map(m => (
          <div key={m} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-red">{labels[m]}</label>
              {(bannerFiles[m] || modalityBannerImages[m]) && (
                <button 
                  onClick={() => {
                    setBannerFiles(prev => { const n = {...prev}; delete n[m]; return n; });
                    setModalityBannerImages(prev => { const n = {...prev}; delete n[m]; return n; });
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-red flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Remover
                </button>
              )}
            </div>
            
            <div className="relative group">
              <input 
                type="file" 
                id={`file-${m}`}
                accept="image/*" 
                onChange={async (e) => {
                  const file = e.target.files?.[0]; 
                  if (file) {
                    const dataUrl = await toDataUrl(file);
                    setBannerFiles(prev => ({ ...prev, [m]: dataUrl }));
                  }
                }} 
                className="hidden" 
              />
              <label 
                htmlFor={`file-${m}`}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all border-dashed"
              >
                <Upload className="w-4 h-4" /> Escolher Banner
              </label>
            </div>

            <div className="h-40 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
              {(bannerFiles[m] || modalityBannerImages[m]) ? (
                <img src={bannerFiles[m] || modalityBannerImages[m]} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sem Imagem</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSection() {
  const utils = trpc.useUtils();
  const { data: messages } = trpc.contact.list.useQuery();
  const statusMutation = trpc.contact.updateStatus.useStatus.useMutation({
    onSuccess: () => { utils.contact.list.invalidate(); toast.success("Status atualizado"); },
    onError: (e) => toast.error(e.message)
  });

  return (
    <div className="space-y-8">
      <div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Mensagens</h2><p className="text-slate-500 font-medium">Contatos realizados pelo site.</p></div>
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100"><tr><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Remetente</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th><th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {messages?.map((m) => (
              <tr key={m.id} className={m.status === 'new' ? 'bg-blue-50/20' : ''}>
                <td className="px-6 py-5"><div className="font-black text-slate-900 mb-1">{m.name}</div><div className="text-xs text-slate-500">{m.email}</div></td>
                <td className="px-6 py-5 text-sm text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-5 text-right"><Button size="sm" variant="ghost" onClick={() => { alert(m.message); if(m.status==='new') statusMutation.mutate({id:m.id, status:'read'}); }}>Ler</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SiteSettingsSection() {
  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();
  const [formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData({
        mainLogoUrl: settings.mainLogoUrl || "",
        footerLogoUrl: settings.footerLogoUrl || "",
        homeHighlightImageUrl: settings.homeHighlightImageUrl || "",
        clinicsHeroImageUrl: settings.clinicsHeroImageUrl || "",
        aboutHeroImageUrl: settings.aboutHeroImageUrl || "",
        aboutMissionImageUrl: settings.aboutMissionImageUrl || "",
        contactHeroImageUrl: settings.contactHeroImageUrl || "",
        homeHeroTitles: settings.homeHeroTitles || {},
        homeHeroImages: settings.homeHeroImages || {},
        partners: settings.partners || [],
        clinics: settings.clinics || [],
        aboutClinics: settings.aboutClinics || [],
        liveStreams: settings.liveStreams || [],
        championshipAddresses: settings.championshipAddresses || [],
      });
    }
  }, [settings]);

  const updateMutation = trpc.site.updateSettings.useMutation({
    onSuccess: () => { utils.site.getSettings.invalidate(); toast.success("Site atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    // Filtrar parceiros e clínicas sem título para evitar erro de validação Zod
    const validPartners = formData.partners?.filter((p: any) => p.name && p.name.trim().length > 0) || [];
    const validClinics = formData.clinics?.filter((c: any) => c.title && c.title.trim().length > 0) || [];
    
    updateMutation.mutate({
      ...formData,
      partners: validPartners,
      clinics: validClinics,
      mainLogoFileDataUrl: files.mainLogo,
      footerLogoFileDataUrl: files.footerLogo,
      homeHighlightImageFileDataUrl: files.homeHighlight,
      clinicsHeroImageFileDataUrl: files.clinicsHero,
      aboutHeroImageFileDataUrl: files.aboutHero,
      aboutMissionImageFileDataUrl: files.aboutMission,
      contactHeroImageFileDataUrl: files.contactHero,
      homeHeroImageFiles: files.homeHero,
    });
  };

  const toDataUrl = (file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", quality));
        };
      };
    });
  };

  const modalities = ["futsal", "basquete", "volei", "handebol", "extra1", "extra2"] as const;

  const ImageUploadField = ({ label, id, fileKey, currentUrl, fileData }: any) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        {(fileData || currentUrl) && (
          <button 
            onClick={() => {
              setFiles((prev: any) => ({ ...prev, [fileKey]: undefined }));
              setFormData((prev: any) => ({ ...prev, [`${fileKey}Url`]: "" }));
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-red flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Remover
          </button>
        )}
      </div>
      <input 
        type="file" 
        id={id}
        accept="image/*" 
        onChange={async (e) => {
          const file = e.target.files?.[0]; 
          if (file) {
            const dataUrl = await toDataUrl(file);
            setFiles((prev: any) => ({ ...prev, [fileKey]: dataUrl }));
          }
        }} 
        className="hidden" 
      />
      <label 
        htmlFor={id}
        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all border-dashed"
      >
        <Upload className="w-3.5 h-3.5" /> Escolher Arquivo
      </label>
      <div className="h-24 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
        {(fileData || currentUrl) ? (
          <img src={fileData || currentUrl} className="h-full w-full object-contain p-2" />
        ) : (
          <ImageIcon className="w-5 h-5 text-slate-200" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex justify-between items-end gap-6">
        <div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Aparência do Site</h2><p className="text-slate-500 font-medium">Logos, Banners, Parceiros e Transmissões.</p></div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand px-10" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <ImageUploadField label="Logo Principal" id="logo-main" fileKey="mainLogo" currentUrl={formData.mainLogoUrl} fileData={files.mainLogo} />
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <ImageUploadField label="Logo Rodapé" id="logo-footer" fileKey="footerLogo" currentUrl={formData.footerLogoUrl} fileData={files.footerLogo} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-8">
        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 border-l-4 border-red pl-4">Imagens de Topo (Hero)</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <ImageUploadField label="Home Highlight" id="hero-home" fileKey="homeHighlight" currentUrl={formData.homeHighlightImageUrl} fileData={files.homeHighlight} />
          <ImageUploadField label="Página Clínicas" id="hero-clinics" fileKey="clinicsHero" currentUrl={formData.clinicsHeroImageUrl} fileData={files.clinicsHero} />
          <ImageUploadField label="Página Quem Somos (Topo)" id="hero-about" fileKey="aboutHero" currentUrl={formData.aboutHeroImageUrl} fileData={files.aboutHero} />
          <ImageUploadField label="Missões (Fundo)" id="about-mission" fileKey="aboutMission" currentUrl={formData.aboutMissionImageUrl} fileData={files.aboutMission} />
          <ImageUploadField label="Página Contato" id="hero-contact" fileKey="contactHero" currentUrl={formData.contactHeroImageUrl} fileData={files.contactHero} />
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
        <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 border-l-4 border-red pl-4">Slider Home (Por Modalidade)</h3>
        <div className="grid md:grid-cols-2 gap-8">
          {modalities.map(m => (
            <div key={`h-${m}`} className="p-6 rounded-[32px] bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-red">{m}</label>
                {(files.homeHero?.[m] || formData.homeHeroImages?.[m]) && (
                  <button 
                    onClick={() => {
                      setFiles((prev: any) => { const n = {...prev, homeHero: {...prev.homeHero}}; delete n.homeHero[m]; return n; });
                      setFormData((prev: any) => { const n = {...prev, homeHeroImages: {...prev.homeHeroImages}}; n.homeHeroImages[m] = ""; return n; });
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-red flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
              <input value={formData.homeHeroTitles?.[m] || ""} onChange={e => setFormData({ ...formData, homeHeroTitles: { ...formData.homeHeroTitles, [m]: e.target.value } })} className="w-full h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm" placeholder="Título do Slide..." />
              
              <div className="relative">
                <input 
                  type="file" 
                  id={`hero-slide-${m}`}
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0]; 
                    if (file) {
                      const dataUrl = await toDataUrl(file);
                      setFiles((prev: any) => ({ ...prev, homeHero: { ...prev.homeHero, [m]: dataUrl } }));
                    }
                  }} 
                  className="hidden" 
                />
                <label 
                  htmlFor={`hero-slide-${m}`}
                  className="w-full h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-all border-dashed"
                >
                  <Upload className="w-3.5 h-3.5" /> Escolher Imagem do Slide
                </label>
              </div>

              <div className="h-24 rounded-xl border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                {(files.homeHero?.[m] || formData.homeHeroImages?.[m]) ? (
                  <img src={files.homeHero?.[m] || formData.homeHeroImages?.[m]} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-100" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Parceiros</h3>
            <Button size="sm" variant="ghost" className="text-red font-bold hover:bg-red/5" onClick={() => setFormData({ ...formData, partners: [...(formData.partners || []), { name: "", logoUrl: "" }] })}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="space-y-4">
            {formData.partners?.map((p: any, i: number) => (
              <div key={i} className="p-5 rounded-[24px] bg-slate-50/50 border border-slate-100 flex flex-col gap-4 relative">
                <button className="absolute top-4 right-4 text-slate-300 hover:text-red transition-colors" onClick={() => setFormData({ ...formData, partners: formData.partners.filter((_:any,idx:number)=>idx!==i) })}><MinusCircle className="w-5 h-5" /></button>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome do Parceiro</label>
                  <input value={p.name} onChange={e => { const np = [...formData.partners]; np[i].name = e.target.value; setFormData({ ...formData, partners: np }); }} className="w-full h-11 bg-white border border-slate-100 rounded-xl px-4 text-sm" placeholder="Ex: Nike, Coca-Cola..." />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Logo do Parceiro</label>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <input 
                        type="file" 
                        id={`partner-logo-${i}`}
                        onChange={async (e) => { 
                          const file = e.target.files?.[0]; 
                          if (file) { 
                            const dataUrl = await toDataUrl(file);
                            const np = [...formData.partners]; 
                            np[i].logoFileDataUrl = dataUrl; 
                            setFormData({ ...formData, partners: np }); 
                          } 
                        }} 
                        className="hidden" 
                      />
                      <label htmlFor={`partner-logo-${i}`} className="w-20 h-20 bg-white border border-slate-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden">
                        {(p.logoFileDataUrl || p.logoUrl) ? <img src={p.logoFileDataUrl || p.logoUrl} className="w-full h-full object-contain p-2" /> : <Upload className="w-6 h-6 text-slate-300" />}
                      </label>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 leading-tight">Recomendado: PNG transparente ou fundo branco.</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!formData.partners || formData.partners.length === 0) && (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl">
                <p className="text-sm text-slate-400 font-medium">Nenhum parceiro adicionado.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Clínicas</h3>
            <Button size="sm" variant="ghost" className="text-red font-bold hover:bg-red/5" onClick={() => setFormData({ ...formData, clinics: [...(formData.clinics || []), { title: "", description: "", imageUrl: "", details: [] }] })}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar Clínica
            </Button>
          </div>
          <div className="space-y-6">
            {formData.clinics?.map((c: any, i: number) => (
              <div key={i} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex flex-col gap-4 relative">
                <button className="absolute top-4 right-4 text-slate-300 hover:text-red transition-colors" onClick={() => setFormData({ ...formData, clinics: formData.clinics.filter((_:any,idx:number)=>idx!==i) })}><Trash2 className="w-5 h-5" /></button>
                
                <input value={c.title} onChange={e => { const nc = [...formData.clinics]; nc[i].title = e.target.value; setFormData({ ...formData, clinics: nc }); }} className="h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm font-bold" placeholder="Título da Clínica" />
                <textarea value={c.description} onChange={e => { const nc = [...formData.clinics]; nc[i].description = e.target.value; setFormData({ ...formData, clinics: nc }); }} className="bg-white border border-slate-100 rounded-xl p-4 text-sm resize-none" rows={3} placeholder="Descrição curta..." />
                
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <input 
                      type="file" 
                      id={`clinic-img-${i}`}
                      onChange={async (e) => { 
                        const file = e.target.files?.[0]; 
                        if (file) { 
                          const dataUrl = await toDataUrl(file);
                          const nc = [...formData.clinics]; 
                          nc[i].imageFileDataUrl = dataUrl; 
                          setFormData({ ...formData, clinics: nc }); 
                        } 
                      }} 
                      className="hidden" 
                    />
                    <label htmlFor={`clinic-img-${i}`} className="w-24 h-24 bg-white border border-slate-200 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden shadow-sm">
                      {(c.imageFileDataUrl || c.imageUrl) ? <img src={c.imageFileDataUrl || c.imageUrl} className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-slate-300" />}
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">Detalhes (separados por vírgula)</label>
                    <input 
                      value={c.details?.join(", ") || ""} 
                      onChange={e => { 
                        const nc = [...formData.clinics]; 
                        nc[i].details = e.target.value.split(",").map(s => s.trim()); 
                        setFormData({ ...formData, clinics: nc }); 
                      }} 
                      className="w-full h-10 bg-white border border-slate-100 rounded-lg px-3 text-xs" 
                      placeholder="Ex: Regras, Tática, Fundamentos" 
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!formData.clinics || formData.clinics.length === 0) && (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl">
                <p className="text-sm text-slate-400 font-medium">Nenhuma clínica cadastrada.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 border-l-4 border-red pl-4">Quadrados "Quem Somos"</h3>
          <p className="text-xs text-slate-400 font-medium">Configure as 4 imagens que aparecem na seção de Missão do Quem Somos.</p>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((idx) => {
              const item = formData.aboutClinics?.[idx] || { title: "", imageUrl: "" };
              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <input 
                    value={item.title} 
                    onChange={e => {
                      const newList = Array.from({ length: 4 }, (_, i) => formData.aboutClinics?.[i] || { title: "", imageUrl: "" });
                      newList[idx].title = e.target.value;
                      setFormData({ ...formData, aboutClinics: newList });
                    }} 
                    className="w-full h-10 bg-white border border-slate-100 rounded-lg px-3 text-xs font-bold" 
                    placeholder={`Título ${idx + 1}...`} 
                  />
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <input 
                        type="file" 
                        id={`about-clinic-img-${idx}`}
                        onChange={async (e) => { 
                          const file = e.target.files?.[0]; 
                          if (file) { 
                            const dataUrl = await toDataUrl(file);
                            const newList = Array.from({ length: 4 }, (_, i) => formData.aboutClinics?.[i] || { title: "", imageUrl: "" });
                            newList[idx].imageFileDataUrl = dataUrl; 
                            setFormData({ ...formData, aboutClinics: newList }); 
                          } 
                        }} 
                        className="hidden" 
                      />
                      <label htmlFor={`about-clinic-img-${idx}`} className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden shadow-sm">
                        {(item.imageFileDataUrl || item.imageUrl) ? <img src={item.imageFileDataUrl || item.imageUrl} className="w-full h-full object-cover" /> : <Upload className="w-4 h-4 text-slate-300" />}
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400">Imagem quadrada recomendada.</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Ao Vivo (YouTube)</h3><Button size="sm" variant="ghost" className="text-red font-bold hover:bg-red/5" onClick={() => setFormData({ ...formData, liveStreams: [...(formData.liveStreams || []), { title: "", youtubeUrl: "" }] })}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button></div>
            <div className="space-y-4">
              {formData.liveStreams?.map((ls: any, i: number) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 flex flex-col gap-2 relative">
                  <button className="absolute top-2 right-2 text-slate-300 hover:text-red" onClick={() => setFormData({ ...formData, liveStreams: formData.liveStreams.filter((_:any,idx:number)=>idx!==i) })}><MinusCircle className="w-4 h-4" /></button>
                  <input value={ls.title} onChange={e => { const nl = [...formData.liveStreams]; nl[i].title = e.target.value; setFormData({ ...formData, liveStreams: nl }); }} className="h-11 bg-white border border-slate-100 rounded-xl px-4 text-sm" placeholder="Título da Transmissão" />
                  <input value={ls.youtubeUrl} onChange={e => { const nl = [...formData.liveStreams]; nl[i].youtubeUrl = e.target.value; setFormData({ ...formData, liveStreams: nl }); }} className="h-11 bg-white border border-slate-100 rounded-xl px-4 text-sm" placeholder="Link do YouTube" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-black uppercase tracking-widest text-slate-900">Endereços</h3><Button size="sm" variant="ghost" className="text-red font-bold hover:bg-red/5" onClick={() => setFormData({ ...formData, championshipAddresses: [...(formData.championshipAddresses || []), ""] })}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button></div>
            <div className="space-y-3">
              {formData.championshipAddresses?.map((addr: string, i: number) => (
                <div key={i} className="flex gap-2"><input value={addr} onChange={e => { const na = [...formData.championshipAddresses]; na[i] = e.target.value; setFormData({ ...formData, championshipAddresses: na }); }} className="flex-1 h-11 bg-white border border-slate-100 rounded-xl px-4 text-sm" placeholder="Endereço Completo..." /><Button size="sm" variant="ghost" onClick={() => setFormData({ ...formData, championshipAddresses: formData.championshipAddresses.filter((_:any,idx:number)=>idx!==i) })}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red" /></Button></div>
              ))}
            </div>
          </div>
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
    onSuccess: () => { utils.staff.list.invalidate(); setName(""); setUsername(""); setPassword(""); setShowForm(false); toast.success("Membro adicionado!"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.staff.delete.useMutation({
    onSuccess: () => { utils.staff.list.invalidate(); toast.success("Membro removido."); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end gap-6"><div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Equipe</h2><p className="text-slate-500 font-medium">Controle de acesso.</p></div><Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand px-8" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancelar" : "Adicionar Membro"}</Button></div>
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <input className="h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <input className="h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} />
            <input className="h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 text-sm" type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl" disabled={!name || !username || !password} onClick={() => createMutation.mutate({ name, username, password })}>Cadastrar</Button>
        </div>
      )}
      <div className="grid gap-4">{staff?.map(s => (
        <div key={s.id} className="bg-white border border-slate-100 rounded-3xl p-6 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-5"><div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><Users className="w-7 h-7" /></div><div><div className="text-lg font-black text-slate-900 mb-1">{s.name}</div><div className="text-xs font-bold text-slate-400 uppercase tracking-widest">@{s.username || "admin"}</div></div></div>
          {s.openId !== "admin-master" && <Button variant="ghost" onClick={() => deleteMutation.mutate({ id: s.id })}><Trash2 className="w-5 h-5 text-slate-300 hover:text-red" /></Button>}
        </div>
      ))}</div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");

  const updateMutation = trpc.auth.updateMe.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado!"); setPassword(""); },
    onError: (e) => toast.error(e.message)
  });

  return (
    <div className="space-y-10">
      <div><h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Meu Perfil</h2><p className="text-slate-500 font-medium">Dados de acesso.</p></div>
      <div className="bg-white rounded-[40px] border border-slate-100 p-8 md:p-12 shadow-sm space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm" />
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">E-mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm" />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Usuário</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm" />
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nova Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl h-14 px-5 text-sm" placeholder="Opcional" />
          </div>
        </div>
        <Button className="h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl px-12" onClick={() => updateMutation.mutate({ name, email, username, password: password || undefined })}>Atualizar</Button>
      </div>
    </div>
  );
}
