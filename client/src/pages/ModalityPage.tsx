import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, Contact, Dribbble, Dumbbell, LogOut, Menu, Target, Trophy, Volleyball, X } from "lucide-react";
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

  const logoScale = 1 - 0.48 * logoShrinkProgress;
  const logoTop = 88 - 38 * logoShrinkProgress;

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
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900">
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

      <header className="sticky top-0 z-50">
        <div className="relative bg-[#D50000] text-white overflow-visible shadow-xl">
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
            <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
          </div>

          <div className="container relative h-24 flex items-center justify-between">
            <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
              <button onClick={() => navigate("/")} className="hover:text-red-100 transition-colors">Home</button>
              <button onClick={() => (window.location.href = "/#torneios")} className="hover:text-red-100 transition-colors">Notícia</button>
              <div className="relative group">
                <button className="inline-flex items-center gap-1 hover:text-red-100 transition-colors">
                  Modalidades
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute top-full left-0 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <div className="min-w-[200px] rounded-xl border border-white/30 bg-[#C80000] shadow-xl p-2">
                    {modalitiesInOrder.map((modalityKey) => (
                      <button
                        key={`menu-mod-${modalityKey}`}
                        onClick={() => navigate(`/modalidade/${modalityKey}`)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-black uppercase tracking-[0.12em] transition-colors ${
                          modalityKey === modality ? "bg-white text-[#C80000]" : "text-white hover:bg-white/15"
                        }`}
                      >
                        {MODALITY_CONFIG[modalityKey]?.navLabel ?? modalityKey}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
              <button onClick={() => navigate("/regulamentos")} className="hover:text-red-100 transition-colors">Regulamento</button>
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
                <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-100 mb-2">Modalidades</p>
                  <div className="flex flex-col gap-1.5">
                    {modalitiesInOrder.map((modalityKey) => (
                      <button
                        key={`mobile-mod-${modalityKey}`}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate(`/modalidade/${modalityKey}`);
                        }}
                        className={`text-left px-2 py-1.5 rounded text-[12px] font-black uppercase tracking-[0.12em] ${
                          modalityKey === modality ? "bg-white text-[#C80000]" : "text-white hover:bg-white/15"
                        }`}
                      >
                        {MODALITY_CONFIG[modalityKey]?.navLabel ?? modalityKey}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => (window.location.href = "/#torneios")} className="text-left">Torneios</button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/regulamentos");
                  }}
                  className="text-left"
                >
                  Regulamento
                </button>
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

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{ backgroundImage: `url(${modalityBannerImageUrl})` }}
        />
        <div className="absolute inset-0 bg-[#051327]/60" />

        <main id="modality-list" className="container relative py-12">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] items-start">
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D50000]">Campeonatos</p>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white">Tabela de torneios</h2>
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-100/80">{list.length} ativos</span>
            </div>

            {list.length === 0 ? (
              <div className="rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md p-16 text-center">
                <Trophy className="w-16 h-16 text-white/70 mx-auto mb-4" />
                <h2 className="text-2xl font-black uppercase tracking-wide text-white">Nenhum torneio ativo em {config.label}</h2>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {list.map((t) => {
                  const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                  const Icon = MODALITY_CONFIG[modality]?.icon ?? Dumbbell;
                  return (
                    <article
                      key={t.id}
                      onClick={() => navigate(`/tournament/${t.id}`)}
                      className="group cursor-pointer rounded-2xl p-5 bg-white/82 backdrop-blur-[2px] border border-white/65 shadow-[0_8px_20px_rgba(2,6,23,0.2)] hover:shadow-[0_14px_30px_rgba(2,6,23,0.3)] hover:bg-white/88 hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.accent }}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight uppercase group-hover:text-[#D50000] transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">{t.category}</p>
                      {t.date && <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red mb-5">{t.date}</p>}
                      {!t.date && <div className="mb-5" />}

                      <div className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.13em] text-[#D50000] group-hover:text-[#05206F]">
                        Ver campeonato
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-white/20 bg-[#05206F]/76 backdrop-blur-md text-white p-6 md:p-7 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-100 mb-2">Radar da modalidade</p>
            <h3 className="text-2xl font-black leading-tight mb-2">O que está acontecendo agora</h3>
            <p className="text-sm text-blue-100/90 leading-relaxed mb-5">
              Atualizações recentes em um formato direto para evitar repetição visual com os cards de campeonatos.
            </p>

            {modalityNews.length === 0 ? (
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm font-bold text-blue-100/90">
                Sem atualizações no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {modalityNews.map((news) => (
                  <article key={`mod-news-${news.id}`} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-100">{news.badgeLabel}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100/80">{news.formattedDate}</span>
                    </div>
                    <h4 className="text-sm font-black text-white leading-tight mb-1">{news.headline}</h4>
                    <p className="text-xs text-blue-100/90 mb-3 leading-relaxed line-clamp-2">{news.summary}</p>
                    <button
                      onClick={() => navigate(`/tournament/${news.tournamentId}`)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-100 hover:text-white"
                    >
                      Ver campeonato
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </aside>
          </div>
        </main>
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
