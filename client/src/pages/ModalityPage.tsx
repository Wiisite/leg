import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Contact, Dribbble, Dumbbell, LogOut, Menu, Target, Trophy, Volleyball, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

const MODALITY_CONFIG: Record<string, { label: string; accent: string; icon: any; navLabel: string }> = {
  futsal: { label: "Futsal", accent: "#D50000", icon: Target, navLabel: "Futsal" },
  basquete: { label: "Basquete", accent: "#CC2A00", icon: Dribbble, navLabel: "Basquete" },
  volei: { label: "Voleibol", accent: "#D50000", icon: Volleyball, navLabel: "Vôlei" },
  handebol: { label: "Handebol", accent: "#B00000", icon: Dumbbell, navLabel: "Handebol" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-100 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-red-100 text-red-700" },
  final: { label: "Final", color: "bg-amber-100 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-emerald-100 text-emerald-700" },
};

export default function ModalityPage() {
  const { isAuthenticated, logout } = useAuth();
  const params = useParams<{ modality: string }>();
  const [, navigate] = useLocation();
  const modality = String(params?.modality || "").toLowerCase();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);

  const { data: tournaments } = trpc.tournament.list.useQuery();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const mainLogoUrl = siteSettings?.mainLogoUrl?.trim() ? siteSettings.mainLogoUrl : "/logo.png";

  const config = MODALITY_CONFIG[modality];

  const list = useMemo(
    () => (tournaments || []).filter((t) => String(t.modality || "").toLowerCase() === modality),
    [tournaments, modality]
  );

  useEffect(() => {
    const onScroll = () => setIsHeaderShrunk(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-[#F0F2F6] flex items-center justify-center px-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center max-w-lg w-full">
          <h1 className="text-2xl font-black uppercase text-slate-900 mb-2">Modalidade não encontrada</h1>
          <p className="text-sm text-slate-600 mb-6">Use as modalidades disponíveis na Home para navegar.</p>
          <Button onClick={() => navigate("/")} className="bg-[#05206F] text-white hover:bg-[#041955]">
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900" style={{ fontFamily: "'Rajdhani', 'Segoe UI', sans-serif" }}>
      <header className="sticky top-0 z-50 shadow-xl">
        <div className="bg-[#05206F] text-white">
          <div className="container h-12 flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.12em]">
            <button className="inline-flex items-center gap-2 hover:text-red-200 transition-colors">
              <Contact className="w-3.5 h-3.5" />
              Fale Conosco
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/admin")}
                  className="h-8 px-3.5 bg-white text-[#05206F] hover:bg-red-50 text-[11px] font-black rounded-md"
                >
                  Painel Admin
                </Button>
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1.5 hover:text-red-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => navigate("/login")} className="hover:text-red-200 transition-colors">
                  Login
                </button>
                <button onClick={() => (window.location.href = getLoginUrl())} className="hover:text-red-200 transition-colors">
                  Cadastro
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative bg-[#D50000] text-white overflow-visible">
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
            <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
          </div>

          <div className="container relative h-24 flex items-center justify-between">
            <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
              <button onClick={() => navigate("/")} className="hover:text-red-100 transition-colors">Home</button>
              <button onClick={() => (window.location.href = "/#torneios")} className="hover:text-red-100 transition-colors">Notícia</button>
              <button onClick={() => document.getElementById("modality-list")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Modalidade</button>
            </nav>

            <div className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${isHeaderShrunk ? "top-[76%]" : "top-[88%]"}`}>
              <div className={`drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)] transition-all duration-300 ${isHeaderShrunk ? "w-24 h-24 md:w-28 md:h-28" : "w-36 h-36 md:w-44 md:h-44"}`}>
                <img src={mainLogoUrl} alt="Logo LEG" className="w-full h-full object-contain" />
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
              <button onClick={() => (window.location.href = "/#torneios")} className="hover:text-red-100 transition-colors">Clínicas</button>
              <button onClick={() => (window.location.href = "/#sobre")} className="hover:text-red-100 transition-colors">Quem Somos</button>
              <button onClick={() => (window.location.href = "/#rodape")} className="hover:text-red-100 transition-colors">Contato</button>
            </nav>

            <button
              className="lg:hidden h-10 w-10 rounded-lg border border-white/40 flex items-center justify-center"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/20 bg-[#C80000]">
              <div className="container py-4 flex flex-col gap-3 text-[13px] font-black uppercase tracking-[0.12em]">
                <button onClick={() => navigate("/")} className="text-left">Home</button>
                <button onClick={() => document.getElementById("modality-list")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Modalidade</button>
                <button onClick={() => (window.location.href = "/#torneios")} className="text-left">Torneios</button>
                <button onClick={() => (window.location.href = "/#rodape")} className="text-left">Contato</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative bg-[#D50000] text-white pt-16 pb-14 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
          <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
        </div>

        <div className="container relative">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-red-100 mb-3">Página da modalidade</p>
          <h1 className="font-black text-4xl md:text-6xl leading-tight" style={{ color: "white" }}>
            {config.label}
          </h1>
        </div>
      </section>

      <main id="modality-list" className="container py-12">
        {list.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-500">Nenhum torneio ativo em {config.label}</h2>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((t) => {
              const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
              const Icon = MODALITY_CONFIG[modality]?.icon ?? Dumbbell;
              return (
                <article
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="group cursor-pointer rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.accent }}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-1 leading-tight uppercase group-hover:text-[#D50000] transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-5">{t.category}</p>

                  <div className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.13em] text-[#D50000] group-hover:text-[#05206F]">
                    Ver campeonato
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
