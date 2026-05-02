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
import { 
  AdminCard, 
  AdminInput, 
  AdminTextArea, 
  ImageUploadField, 
  toDataUrl 
} from "@/components/AdminUI";

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
  const labels: Record<string, string> = { futsal: "Futsal", basquete: "Basquete", volei: "Vôlei", handebol: "Handebol", extra1: "Extra 1", extra2: "Extra 2" };
  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();
  const [modalityBannerImages, setModalityBannerImages] = useState<Record<string, string>>({});
  const [bannerFiles, setBannerFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings?.modalityBannerImages) setModalityBannerImages(settings.modalityBannerImages);
  }, [settings]);

  const updateMutation = trpc.site.updateSettings.useMutation({
    onSuccess: () => { utils.site.getSettings.invalidate(); toast.success("Banners atualizados!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ modalityBannerImages, modalityBannerImageFiles: bannerFiles });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Banners de Modalidade</h2>
          <p className="text-slate-500 font-medium">Altere os banners exibidos no final de cada página de esporte.</p>
        </div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand px-10" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modalities.map(m => (
          <AdminCard key={m} title={labels[m] || m}>
            <ImageUploadField 
              label="Banner da Modalidade"
              id={`banner-${m}`}
              currentUrl={modalityBannerImages[m]}
              fileData={bannerFiles[m]}
              onUpload={(dataUrl: string) => setBannerFiles(prev => ({ ...prev, [m]: dataUrl }))}
              onRemove={() => {
                setBannerFiles(prev => { const n = {...prev}; delete n[m]; return n; });
                setModalityBannerImages(prev => { const n = {...prev}; delete n[m]; return n; });
              }}
            />
          </AdminCard>
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
  const [activeTab, setActiveTab] = useState("general");

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
    const validPartners = (formData.partners || []).filter((p: any) => p.name?.trim());
    const validClinics = (formData.clinics || []).filter((c: any) => c.title?.trim());

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

  const modalities = ["futsal", "basquete", "volei", "handebol", "extra1", "extra2"] as const;

  const tabs = [
    { id: "general", label: "Geral", icon: Settings },
    { id: "hero", label: "Imagens de Topo", icon: ImageIcon },
    { id: "slider", label: "Slider Home", icon: Menu },
    { id: "lists", label: "Conteúdo & Listas", icon: Plus },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Configurações do Site</h2>
          <p className="text-slate-500 font-medium">Personalize a aparência e o conteúdo público.</p>
        </div>
        <Button className="h-14 bg-red text-white font-black uppercase tracking-widest rounded-2xl shadow-brand px-10" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar Todas Alterações"}
        </Button>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-white text-red shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === "general" && (
          <div className="grid md:grid-cols-2 gap-6">
            <AdminCard title="Identidade Visual">
              <div className="grid grid-cols-2 gap-6">
                <ImageUploadField 
                  label="Logo Principal" 
                  id="logo-main" 
                  currentUrl={formData.mainLogoUrl} 
                  fileData={files.mainLogo}
                  onUpload={(url: string) => setFiles((p: any) => ({ ...p, mainLogo: url }))}
                  onRemove={() => { setFiles((p: any) => ({ ...p, mainLogo: undefined })); setFormData((p: any) => ({ ...p, mainLogoUrl: "" })); }}
                />
                <ImageUploadField 
                  label="Logo Rodapé" 
                  id="logo-footer" 
                  currentUrl={formData.footerLogoUrl} 
                  fileData={files.footerLogo}
                  onUpload={(url: string) => setFiles((p: any) => ({ ...p, footerLogo: url }))}
                  onRemove={() => { setFiles((p: any) => ({ ...p, footerLogo: undefined })); setFormData((p: any) => ({ ...p, footerLogoUrl: "" })); }}
                />
              </div>
            </AdminCard>
            <AdminCard title="Endereços Oficiais">
              <div className="space-y-3">
                {formData.championshipAddresses?.map((addr: string, i: number) => (
                  <div key={i} className="flex gap-2">
                    <AdminInput 
                      value={addr} 
                      onChange={(e: any) => { const na = [...formData.championshipAddresses]; na[i] = e.target.value; setFormData({ ...formData, championshipAddresses: na }); }} 
                      placeholder="Endereço Completo..." 
                      className="flex-1"
                    />
                    <Button size="sm" variant="ghost" className="h-12" onClick={() => setFormData({ ...formData, championshipAddresses: formData.championshipAddresses.filter((_:any,idx:number)=>idx!==i) })}>
                      <Trash2 className="w-4 h-4 text-slate-300 hover:text-red" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full h-12 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-red font-bold" onClick={() => setFormData({ ...formData, championshipAddresses: [...(formData.championshipAddresses || []), ""] })}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Endereço
                </Button>
              </div>
            </AdminCard>
          </div>
        )}

        {activeTab === "hero" && (
          <AdminCard title="Imagens de Fundo (Hero Sections)">
            <div className="grid md:grid-cols-3 gap-8">
              <ImageUploadField label="Destaque Home" id="hero-home" currentUrl={formData.homeHighlightImageUrl} fileData={files.homeHighlight} onUpload={(url:string)=>setFiles((p:any)=>({...p, homeHighlight:url}))} onRemove={()=>{setFiles((p:any)=>({...p, homeHighlight:undefined})); setFormData((p:any)=>({...p, homeHighlightImageUrl:""}));}} />
              <ImageUploadField label="Topo Clínicas" id="hero-clinics" currentUrl={formData.clinicsHeroImageUrl} fileData={files.clinicsHero} onUpload={(url:string)=>setFiles((p:any)=>({...p, clinicsHero:url}))} onRemove={()=>{setFiles((p:any)=>({...p, clinicsHero:undefined})); setFormData((p:any)=>({...p, clinicsHeroImageUrl:""}));}} />
              <ImageUploadField label="Topo Quem Somos" id="hero-about" currentUrl={formData.aboutHeroImageUrl} fileData={files.aboutHero} onUpload={(url:string)=>setFiles((p:any)=>({...p, aboutHero:url}))} onRemove={()=>{setFiles((p:any)=>({...p, aboutHero:undefined})); setFormData((p:any)=>({...p, aboutHeroImageUrl:""}));}} />
              <ImageUploadField label="Missões (Quem Somos)" id="about-mission" currentUrl={formData.aboutMissionImageUrl} fileData={files.aboutMission} onUpload={(url:string)=>setFiles((p:any)=>({...p, aboutMission:url}))} onRemove={()=>{setFiles((p:any)=>({...p, aboutMission:undefined})); setFormData((p:any)=>({...p, aboutMissionImageUrl:""}));}} />
              <ImageUploadField label="Topo Contato" id="hero-contact" currentUrl={formData.contactHeroImageUrl} fileData={files.contactHero} onUpload={(url:string)=>setFiles((p:any)=>({...p, contactHero:url}))} onRemove={()=>{setFiles((p:any)=>({...p, contactHero:undefined})); setFormData((p:any)=>({...p, contactHeroImageUrl:""}));}} />
            </div>
          </AdminCard>
        )}

        {activeTab === "slider" && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modalities.map(m => (
              <AdminCard key={`h-${m}`} title={m}>
                <AdminInput 
                  label="Título do Slide" 
                  value={formData.homeHeroTitles?.[m] || ""} 
                  onChange={(e: any) => setFormData({ ...formData, homeHeroTitles: { ...formData.homeHeroTitles, [m]: e.target.value } })} 
                  placeholder="Ex: Campeonato de Futsal..." 
                />
                <ImageUploadField 
                  label="Imagem do Slide" 
                  id={`hero-slide-${m}`} 
                  currentUrl={formData.homeHeroImages?.[m]} 
                  fileData={files.homeHero?.[m]} 
                  onUpload={(url: string) => setFiles((p: any) => ({ ...p, homeHero: { ...(p.homeHero || {}), [m]: url } }))}
                  onRemove={() => {
                    setFiles((p: any) => { const n = {...p, homeHero: {...p.homeHero}}; delete n.homeHero[m]; return n; });
                    setFormData((p: any) => { const n = {...p, homeHeroImages: {...p.homeHeroImages}}; n.homeHeroImages[m] = ""; return n; });
                  }}
                />
              </AdminCard>
            ))}
          </div>
        )}

        {activeTab === "lists" && (
          <div className="grid grid-cols-1 gap-8">
            <AdminCard title="Parceiros" extra={<Button size="sm" variant="ghost" className="text-red font-bold" onClick={() => setFormData({ ...formData, partners: [...(formData.partners || []), { name: "", logoUrl: "" }] })}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>}>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {formData.partners?.map((p: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative">
                    <button className="absolute top-2 right-2 text-slate-300 hover:text-red" onClick={() => setFormData({ ...formData, partners: formData.partners.filter((_:any,idx:number)=>idx!==i) })}><MinusCircle className="w-4 h-4" /></button>
                    <AdminInput 
                      value={p.name} 
                      onChange={(e: any) => { const np = [...formData.partners]; np[i].name = e.target.value; setFormData({ ...formData, partners: np }); }} 
                      placeholder="Nome do Parceiro"
                      className="mb-3 h-10"
                    />
                    <ImageUploadField 
                      id={`partner-${i}`} 
                      currentUrl={p.logoUrl} 
                      fileData={p.logoFileDataUrl} 
                      onUpload={(url:string)=>{const np = [...formData.partners]; np[i].logoFileDataUrl = url; setFormData({...formData, partners: np});}}
                      onRemove={()=>{const np = [...formData.partners]; np[i].logoFileDataUrl = undefined; np[i].logoUrl = ""; setFormData({...formData, partners: np});}}
                      aspect="square"
                    />
                  </div>
                ))}
              </div>
            </AdminCard>

            <div className="grid md:grid-cols-2 gap-8">
              <AdminCard title="Clínicas" extra={<Button size="sm" variant="ghost" className="text-red font-bold" onClick={() => setFormData({ ...formData, clinics: [...(formData.clinics || []), { title: "", description: "", imageUrl: "", details: [] }] })}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>}>
                <div className="space-y-4">
                  {formData.clinics?.map((c: any, i: number) => (
                    <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 relative">
                      <button className="absolute top-3 right-3 text-slate-300 hover:text-red" onClick={() => setFormData({ ...formData, clinics: formData.clinics.filter((_:any,idx:number)=>idx!==i) })}><Trash2 className="w-4 h-4" /></button>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <AdminInput value={c.title} onChange={(e: any) => { const nc = [...formData.clinics]; nc[i].title = e.target.value; setFormData({ ...formData, clinics: nc }); }} placeholder="Título da Clínica" />
                          <AdminTextArea value={c.description} onChange={(e: any) => { const nc = [...formData.clinics]; nc[i].description = e.target.value; setFormData({ ...formData, clinics: nc }); }} placeholder="Descrição curta..." rows={2} />
                        </div>
                        <ImageUploadField 
                          id={`clinic-${i}`} 
                          currentUrl={c.imageUrl} 
                          fileData={c.imageFileDataUrl} 
                          onUpload={(url:string)=>{const nc = [...formData.clinics]; nc[i].imageFileDataUrl = url; setFormData({...formData, clinics: nc});}}
                          onRemove={()=>{const nc = [...formData.clinics]; nc[i].imageFileDataUrl = undefined; nc[i].imageUrl = ""; setFormData({...formData, clinics: nc});}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <div className="space-y-8">
                <AdminCard title="Ao Vivo (YouTube)" extra={<Button size="sm" variant="ghost" className="text-red font-bold" onClick={() => setFormData({ ...formData, liveStreams: [...(formData.liveStreams || []), { title: "", youtubeUrl: "" }] })}><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>}>
                  <div className="space-y-3">
                    {formData.liveStreams?.map((ls: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 relative">
                        <button className="absolute top-2 right-2 text-slate-300 hover:text-red" onClick={() => setFormData({ ...formData, liveStreams: formData.liveStreams.filter((_:any,idx:number)=>idx!==i) })}><MinusCircle className="w-4 h-4" /></button>
                        <AdminInput value={ls.title} onChange={(e: any) => { const nl = [...formData.liveStreams]; nl[i].title = e.target.value; setFormData({ ...formData, liveStreams: nl }); }} placeholder="Título da Transmissão" className="mb-2" />
                        <AdminInput value={ls.youtubeUrl} onChange={(e: any) => { const nl = [...formData.liveStreams]; nl[i].youtubeUrl = e.target.value; setFormData({ ...formData, liveStreams: nl }); }} placeholder="URL do YouTube" />
                      </div>
                    ))}
                  </div>
                </AdminCard>

                <AdminCard title="Missão (4 Quadrados)">
                  <div className="grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((idx) => {
                      const item = formData.aboutClinics?.[idx] || { title: "", imageUrl: "" };
                      return (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                          <AdminInput 
                            value={item.title} 
                            onChange={(e: any) => {
                              const newList = Array.from({ length: 4 }, (_, i) => formData.aboutClinics?.[i] || { title: "", imageUrl: "" });
                              newList[idx].title = e.target.value;
                              setFormData({ ...formData, aboutClinics: newList });
                            }} 
                            placeholder={`Título ${idx + 1}`} 
                          />
                          <ImageUploadField 
                            id={`mission-${idx}`} 
                            currentUrl={item.imageUrl} 
                            fileData={item.imageFileDataUrl} 
                            onUpload={(url:string)=>{
                              const newList = Array.from({ length: 4 }, (_, i) => formData.aboutClinics?.[i] || { title: "", imageUrl: "" });
                              newList[idx].imageFileDataUrl = url;
                              setFormData({ ...formData, aboutClinics: newList });
                            }}
                            onRemove={()=>{
                              const newList = Array.from({ length: 4 }, (_, i) => formData.aboutClinics?.[i] || { title: "", imageUrl: "" });
                              newList[idx].imageFileDataUrl = undefined;
                              newList[idx].imageUrl = "";
                              setFormData({ ...formData, aboutClinics: newList });
                            }}
                            aspect="square"
                          />
                        </div>
                      );
                    })}
                  </div>
                </AdminCard>
              </div>
            </div>
          </div>
        )}
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
