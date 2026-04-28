import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SiteFooter } from "@/components/SiteFooter";
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

const DEFAULT_MODALITY_BANNER_IMAGE: Record<string, string> = {
  futsal: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1800&q=80",
  basquete: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1800&q=80",
  volei: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1800&q=80",
  handebol: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1800&q=80",
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
  const [logoShrinkProgress, setLogoShrinkProgress] = useState(0);

  const { data: tournaments } = trpc.tournament.list.useQuery();
  const { data: homeNews } = trpc.tournament.getHomeNews.useQuery();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const mainLogoUrl = siteSettings?.mainLogoUrl?.trim() ? siteSettings.mainLogoUrl : "/logo.png";
  const footerLogoUrl = siteSettings?.footerLogoUrl?.trim() ? siteSettings.footerLogoUrl : mainLogoUrl;
  const partners = siteSettings?.partners ?? [];
  const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];
  const modalityBannerImages = siteSettings?.modalityBannerImages ?? {};

  const config = MODALITY_CONFIG[modality];
  const modalityBannerImageUrl =
    (typeof modalityBannerImages[modality as keyof typeof modalityBannerImages] === "string"
      ? modalityBannerImages[modality as keyof typeof modalityBannerImages]
      : "") || DEFAULT_MODALITY_BANNER_IMAGE[modality] || DEFAULT_MODALITY_BANNER_IMAGE.futsal;

  const list = useMemo(
    () => (tournaments || []).filter((t) => String(t.modality || "").toLowerCase() === modality),
    [tournaments, modality]
  );

  const fallbackModalityNews = useMemo(() => {
    const modalityLabel = config?.label ?? "modalidade";
    return [...list]
      .sort((a, b) => {
        const dateA = new Date(String((a as any).updatedAt ?? (a as any).createdAt ?? 0)).getTime();
        const dateB = new Date(String((b as any).updatedAt ?? (b as any).createdAt ?? 0)).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return Number((b as any).id ?? 0) - Number((a as any).id ?? 0);
      })
      .slice(0, 6)
      .map((t) => {
        const statusLabel = STATUS_LABELS[t.status]?.label ?? "Atualização";
        const lastUpdate = new Date(String((t as any).updatedAt ?? (t as any).createdAt ?? Date.now()));
        const formattedDate = Number.isNaN(lastUpdate.getTime())
          ? "Atualizado recentemente"
          : lastUpdate.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

        const headline = t.champion
          ? `${t.champion} conquista o título no ${t.name}`
          : `${t.name}: ${statusLabel.toLowerCase()}`;

        const summary = t.champion
          ? `Título confirmado na categoria ${t.category}. Veja os detalhes da campanha no ${modalityLabel.toLowerCase()}.`
          : `A disputa da categoria ${t.category} está em ${statusLabel.toLowerCase()}. Acompanhe tabela e próximos jogos.`;

        return {
          id: t.id,
          tournamentId: t.id,
          badgeLabel: statusLabel,
          headline,
          summary,
          formattedDate,
        };
      });
  }, [list, config?.label]);

  const modalityNews = useMemo(() => {
    const filteredFromHome = (homeNews ?? [])
      .filter((news) => String(news.modalityKey || "").toLowerCase() === modality)
      .map((news) => ({
        id: news.id,
        tournamentId: news.tournamentId,
        badgeLabel: "Destaque",
        headline: news.headline,
        summary: news.summary,
        formattedDate: news.formattedDate,
      }));

    return filteredFromHome.length > 0 ? filteredFromHome : fallbackModalityNews;
  }, [homeNews, modality, fallbackModalityNews]);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = 140;
      const progress = Math.min(1, window.scrollY / maxScroll);
      setLogoShrinkProgress(progress);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logoScale = 1 - 0.36 * logoShrinkProgress;
  const logoTop = 88 - 12 * logoShrinkProgress;

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

            <div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150"
              style={{ top: `${logoTop}%` }}
            >
              <div
                className="w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)] origin-center transition-transform duration-150"
                style={{ transform: `scale(${logoScale})` }}
              >
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

      <section className="relative min-h-[320px] md:min-h-[420px] overflow-hidden bg-white text-white">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{ backgroundImage: `url(${modalityBannerImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#081226]/78 via-[#10203A]/64 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

        <div className="container relative py-14 md:py-20">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-3 [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">Página da modalidade</p>
          <h1 className="font-black text-4xl md:text-6xl leading-tight mb-3 [text-shadow:0_3px_16px_rgba(0,0,0,0.6)]">Competições em destaque</h1>
          <p className="text-sm md:text-lg text-white max-w-2xl [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
            Acompanhe jogos, tabela, classificação e novidades da Liga Escolar Guarulhense.
          </p>
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

      <section className="relative isolate overflow-hidden mt-8 min-h-[340px] md:min-h-[460px]">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{ backgroundImage: `url(${modalityBannerImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060B1B]/82 via-[#0C1730]/68 to-[#111827]/56" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

        <div className="container relative py-12 md:py-20">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-white/20 bg-white/8 backdrop-blur-md shadow-[0_20px_55px_rgba(2,6,23,0.45)] px-6 py-8 md:px-10 md:py-12 text-white">
            <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.2em] text-red-100/95 mb-3 text-center">Destaques dos campeonatos</p>
            <h2 className="text-3xl md:text-5xl font-black leading-tight mb-3 text-center">O que está acontecendo agora</h2>
            <p className="text-sm md:text-lg text-white/90 leading-relaxed max-w-2xl mx-auto mb-8 text-center">
              Atualizações recentes da modalidade com acesso direto para cada campeonato.
            </p>

            {modalityNews.length === 0 ? (
              <div className="rounded-2xl border border-white/20 bg-black/20 p-7 text-center">
                <p className="text-sm font-bold text-white/90">Sem atualizações no momento.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modalityNews.map((news) => (
                  <article
                    key={`mod-news-${news.id}`}
                    className="rounded-2xl border border-white/15 bg-black/15 backdrop-blur-[2px] p-5 shadow-sm hover:shadow-lg hover:bg-black/25 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/15 text-white/90">
                        {news.badgeLabel}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{news.formattedDate}</span>
                    </div>

                    <h4 className="text-lg font-black text-white leading-tight mb-2">{news.headline}</h4>
                    <p className="text-sm text-white/85 mb-4 leading-relaxed">{news.summary}</p>

                    <button
                      onClick={() => navigate(`/tournament/${news.tournamentId}`)}
                      className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-red-100 hover:text-white"
                    >
                      Ver campeonato
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <SiteFooter
        footerLogoUrl={footerLogoUrl}
        modalities={modalitiesInOrder}
        modalityLabelByKey={Object.fromEntries(modalitiesInOrder.map((mod) => [mod, MODALITY_CONFIG[mod]?.label ?? mod]))}
        onModalityClick={(modalityKey) => navigate(`/modalidade/${modalityKey}`)}
      />
    </div>
  );
}
