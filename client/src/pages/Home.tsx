import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Contact,
  Dribbble,
  Dumbbell,
  LogOut,
  Menu,
  Shield,
  Swords,
  Target,
  Trophy,
  Volleyball,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function CourtIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
    </svg>
  );
}

function HandballIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16" />
      <path d="M12 4a8 8 0 0 0 0 16" />
      <path d="M4.8 9.2c2 .7 3.7 1.7 5 2.8" />
      <path d="M14.2 12c1.3 1.1 3 2.1 5 2.8" />
      <path d="M4.8 14.8c2-.7 3.7-1.7 5-2.8" />
      <path d="M14.2 12c1.3-1.1 3-2.1 5-2.8" />
    </svg>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-100 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-red-100 text-red-700" },
  final: { label: "Final", color: "bg-amber-100 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-emerald-100 text-emerald-700" },
};

const MODALITY_CONFIG: Record<
  string,
  { label: string; icon: any; accent: string; lightAccent: string; navLabel: string }
> = {
  futsal: {
    label: "Futsal",
    navLabel: "Futsal",
    icon: CourtIcon,
    accent: "#D50000",
    lightAccent: "#FFE8E8",
  },
  basquete: {
    label: "Basquete",
    navLabel: "Basquete",
    icon: Dribbble,
    accent: "#CC2A00",
    lightAccent: "#FFEDE6",
  },
  volei: {
    label: "Voleibol",
    navLabel: "Vôlei",
    icon: Volleyball,
    accent: "#D50000",
    lightAccent: "#FFE8E8",
  },
  handebol: {
    label: "Handebol",
    navLabel: "Handebol",
    icon: HandballIcon,
    accent: "#B00000",
    lightAccent: "#FFECEC",
  },
};

const HERO_IMAGE_BY_MODALITY: Record<string, string> = {
  futsal: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
  basquete: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80",
  volei: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1600&q=80",
  handebol: "https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1600&q=80",
};

const LEGACY_QUIEN_SOMOS_URL = "https://ligaescolarguarulhense.com.br/quem_somos/";
const LEGACY_CLINICAS_URL = "https://ligaescolarguarulhense.com.br/clinicas/";

type HeroSlide = {
  id: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  imageUrl: string;
  onClick: () => void;
};

export default function Home() {
  const [, navigate] = useLocation();
  const sliderRef = useRef<HTMLDivElement>(null);
  const partnersSliderRef = useRef<HTMLDivElement>(null);
  const [isPartnersHovered, setIsPartnersHovered] = useState(false);

  const { data: tournaments } = trpc.tournament.list.useQuery();
  const { data: homeNews } = trpc.tournament.getHomeNews.useQuery();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const mainLogoUrl = siteSettings?.mainLogoUrl?.trim() ? siteSettings.mainLogoUrl : "/logo.png";
  const footerLogoUrl = siteSettings?.footerLogoUrl?.trim() ? siteSettings.footerLogoUrl : mainLogoUrl;
  const homeHighlightImageUrl =
    siteSettings?.homeHighlightImageUrl?.trim()
      ? siteSettings.homeHighlightImageUrl
      : "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1800&q=80";
  const homeHeroImages = siteSettings?.homeHeroImages ?? {};
  const homeHeroTitles = siteSettings?.homeHeroTitles ?? {};
  const partners = siteSettings?.partners ?? [];

  const getHomeHeroImage = (modality: string) => {
    const configured = homeHeroImages[modality as keyof typeof homeHeroImages];
    if (typeof configured === "string" && configured.trim().length > 0) return configured;
    return HERO_IMAGE_BY_MODALITY[modality] ?? HERO_IMAGE_BY_MODALITY.futsal;
  };

  const groupedTournaments = useMemo(() => {
    return tournaments?.reduce((acc, t) => {
      const mod = t.modality || "outros";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(t);
      return acc;
    }, {} as Record<string, typeof tournaments>);
  }, [tournaments]);

  const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];

  const scrollToModality = (modality: string) => {
    document.getElementById(modality)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId: string, offset = 140) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const goToExternalPage = (url: string) => {
    window.location.href = url;
    setMobileMenuOpen(false);
  };

  const heroSlides = useMemo<HeroSlide[]>(() => {
    return modalitiesInOrder.map((modalityKey) => {
      const modalityLabel = MODALITY_CONFIG[modalityKey]?.label ?? "Modalidade";
      const configuredTitle = homeHeroTitles[modalityKey as keyof typeof homeHeroTitles];
      const title = typeof configuredTitle === "string" && configuredTitle.trim().length > 0
        ? configuredTitle.trim()
        : modalityLabel;

      return {
        id: `hero-${modalityKey}`,
        badge: `Modalidade • ${modalityLabel}`,
        title: title.toUpperCase(),
        description: `Acompanhe campeonatos, partidas e classificações de ${modalityLabel.toLowerCase()} na plataforma da LEG.`,
        cta: "Acessar modalidade",
        imageUrl: getHomeHeroImage(modalityKey),
        onClick: () => navigate(`/modalidade/${modalityKey}`),
      };
    });
  }, [homeHeroTitles, navigate, homeHeroImages]);

  const championshipNews = useMemo(() => {
    const list = [...(tournaments ?? [])]
      .sort((a, b) => {
        const dateA = new Date(String((a as any).updatedAt ?? (a as any).createdAt ?? 0)).getTime();
        const dateB = new Date(String((b as any).updatedAt ?? (b as any).createdAt ?? 0)).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return Number((b as any).id ?? 0) - Number((a as any).id ?? 0);
      })
      .slice(0, 8)
      .map((t) => {
        const modalityKey = String(t.modality || "futsal").toLowerCase();
        const modalityLabel = MODALITY_CONFIG[modalityKey]?.label ?? "Modalidade";
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
          ? `${t.name} definiu campeão`
          : `${t.name} segue em ${statusLabel.toLowerCase()}`;
        const summary = t.champion
          ? `Título confirmado para ${t.champion}. Confira os detalhes da campanha na modalidade ${modalityLabel.toLowerCase()}.`
          : `A competição da categoria ${t.category} está em ${statusLabel.toLowerCase()}. Acompanhe os próximos resultados.`;

        return {
          id: t.id,
          tournamentId: t.id,
          modalityKey,
          modalityLabel,
          statusLabel,
          headline,
          summary,
          formattedDate,
        };
      });

    return list;
  }, [tournaments]);

  const renderedNews = homeNews && homeNews.length > 0 ? homeNews : championshipNews;

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (!partnersSliderRef.current || partners.length <= 1 || isPartnersHovered) return;
    const slider = partnersSliderRef.current;
    const timer = window.setInterval(() => {
      const step = 220;
      const nearEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 24;
      if (nearEnd) {
        slider.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      slider.scrollBy({ left: step, behavior: "smooth" });
    }, 2600);

    return () => window.clearInterval(timer);
  }, [partners.length, isPartnersHovered]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const slideSports = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const amount = Math.max(280, sliderRef.current.clientWidth * 0.7);
    sliderRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900">
      <SiteHeader isHome />

      <section className="relative bg-[#D50000] text-white pt-20 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-20 -right-20 h-80 w-80 border border-white/15 rounded-full" />
          <div className="absolute -top-28 -left-10 h-72 w-72 border border-white/15 rounded-full" />
          <div className="absolute top-0 right-16 h-full w-36 bg-[#BC0000] skew-x-[-26deg] opacity-35" />
        </div>

        <div className="relative">
          <div className="relative w-full overflow-hidden border-y border-white/30 min-h-[460px] md:min-h-[620px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] bg-[#9E0000]">
            {heroSlides.map((slide, index) => (
              <article
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ${index === heroIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <img src={slide.imageUrl} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#120303]/90 via-[#120303]/70 to-[#120303]/45" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                <div className="relative h-full p-6 md:p-10 lg:p-12 flex flex-col justify-end max-w-3xl">
                  <p className="text-[11px] md:text-xs uppercase tracking-[0.22em] font-black text-red-100 mb-3">{slide.badge}</p>
                  <h1 className="font-black text-3xl md:text-5xl leading-tight mb-4">{slide.title}</h1>
                  <p className="text-red-100 text-sm md:text-base mb-6 max-w-2xl">{slide.description}</p>
                  <Button
                    onClick={slide.onClick}
                    className="h-11 px-6 w-fit bg-white text-[#D50000] hover:bg-[#05206F] hover:text-white font-black uppercase tracking-[0.12em]"
                  >
                    {slide.cta}
                  </Button>
                </div>
              </article>
            ))}

            {heroSlides.length > 1 && (
              <div className="absolute right-4 bottom-4 md:right-6 md:bottom-6 flex items-center gap-2 z-20">
                <button
                  className="h-9 w-9 rounded-full border border-white/60 bg-black/25 hover:bg-black/45 transition-colors"
                  onClick={() => setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                  aria-label="Slide anterior"
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>
                <button
                  className="h-9 w-9 rounded-full border border-white/60 bg-black/25 hover:bg-black/45 transition-colors"
                  onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
                  aria-label="Próximo slide"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
            )}

            {heroSlides.length > 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 flex items-center gap-2">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`${slide.id}-dot`}
                    onClick={() => setHeroIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${index === heroIndex ? "w-8 bg-white" : "w-2.5 bg-white/50"}`}
                    aria-label={`Ir para slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="modalidades" className="container -mt-10 relative z-20 mb-16">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-5 md:p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-2xl font-black uppercase tracking-wide text-[#05206F]">Modalidades em destaque</h2>
            <div className="flex items-center gap-2">
              <button
                className="h-10 w-10 rounded-full border border-slate-300 text-slate-600 hover:bg-[#05206F] hover:text-white transition-colors"
                onClick={() => slideSports("left")}
              >
                <ChevronLeft className="w-4 h-4 mx-auto" />
              </button>
              <button
                className="h-10 w-10 rounded-full border border-slate-300 text-slate-600 hover:bg-[#05206F] hover:text-white transition-colors"
                onClick={() => slideSports("right")}
              >
                <ChevronRight className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          <div
            ref={sliderRef}
            className="flex gap-4 overflow-x-auto md:overflow-visible pb-2 snap-x snap-mandatory md:flex-wrap md:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {modalitiesInOrder.map((modality) => {
              const config = MODALITY_CONFIG[modality];
              const Icon = config?.icon ?? Dumbbell;
              return (
                <article
                  key={modality}
                  className="snap-start shrink-0 w-[220px] md:w-[260px] rounded-2xl border border-slate-200 bg-[#F7F8FA] p-6"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: config?.lightAccent }}
                  >
                    <Icon className="w-7 h-7" style={{ color: config?.accent }} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{config?.label ?? modality}</h3>
                  <button
                    onClick={() => navigate(`/modalidade/${modality}`)}
                    className="text-xs font-black uppercase tracking-[0.16em] inline-flex items-center gap-1 text-[#D50000] hover:text-[#05206F]"
                  >
                    Ver página <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="sobre" className="relative min-h-[420px] md:min-h-[520px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1800&q=80)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07174B]/92 via-[#07174B]/82 to-[#07174B]/50" />

        <div className="container relative py-16 md:py-24 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-red-100 mb-3">Quem Somos</p>
          <h2 className="text-4xl md:text-6xl font-black leading-tight mb-5 max-w-4xl">
            O verdadeiro espírito do esporte escolar
          </h2>
          <p className="text-red-100 text-sm md:text-lg leading-relaxed max-w-4xl">
            A Liga Escolar Guarulhense nasce com o objetivo de se tornar referência esportiva para crianças e
            adolescentes matriculados nas escolas do município, oferecendo competições com organização, respeito e
            oportunidade de sociabilização no ambiente educacional.
          </p>
        </div>
      </section>

      <section id="noticias" className="container mb-14 scroll-mt-36">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D50000]">Notícias</p>
              <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-[#05206F]">O que está acontecendo nos campeonatos</h3>
            </div>
          </div>

          {renderedNews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold text-slate-500">Sem atualizações no momento.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {renderedNews.map((news) => (
                <article key={`news-${news.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-700">
                      {news.modalityLabel}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{news.formattedDate}</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{news.headline}</h4>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{news.summary}</p>
                  <button
                    onClick={() => navigate(`/tournament/${news.tournamentId}`)}
                    className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-[#D50000] hover:text-[#05206F]"
                  >
                    Acessar página
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative min-h-[380px] md:min-h-[500px] overflow-hidden mb-14">
        <div
          className="absolute inset-0 bg-cover bg-center md:bg-fixed"
          style={{ backgroundImage: `url(${homeHighlightImageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B102D]/86 via-[#0B102D]/72 to-[#0B102D]/58" />

        <div className="container relative h-full py-16 md:py-24 flex flex-col items-center justify-center text-center max-w-4xl text-white">
          <p className="text-[11px] md:text-xs font-black uppercase tracking-[0.2em] text-red-100 mb-3">Destaque LEG</p>
          <h3 className="text-4xl md:text-6xl font-black leading-[1.05] max-w-3xl">
            LEG cada vez mais forte e unida pelo esporte escolar
          </h3>
        </div>
      </section>

      <main id="torneios" className="container pb-24">
        {tournaments?.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-500">Nenhum torneio ativo no momento</h2>
          </div>
        ) : (
          <div className="space-y-14">
            {modalitiesInOrder.map((mod) => {
              const list = groupedTournaments?.[mod] ?? [];
              if (list.length === 0) return null;
              const config = MODALITY_CONFIG[mod];
              const Icon = config?.icon ?? Dumbbell;

              return (
                <section key={mod} id={mod} className="scroll-mt-30">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: config?.accent ?? "#D50000" }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase leading-none" style={{ color: config?.accent ?? "#D50000" }}>
                          {config?.label ?? mod}
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mt-1">
                          {list.length} torneio{list.length > 1 ? "s" : ""} em disputa
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => scrollToModality(mod)}
                      className="hidden md:inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-[#05206F]"
                    >
                      Ir para modalidade
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((t) => {
                      const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                      return (
                        <div
                          key={t.id}
                          onClick={() => navigate(`/tournament/${t.id}`)}
                          className="group cursor-pointer rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-11 h-11 rounded-xl bg-[#05206F] flex items-center justify-center">
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

                          {t.champion ? (
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                                <Trophy className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div>
                                <span className="block text-[9px] font-black text-amber-800/50 uppercase tracking-widest">Campeão</span>
                                <span className="block text-xs font-black text-amber-900 uppercase">{t.champion}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.13em] text-[#D50000] group-hover:text-[#05206F]">
                              Ver tabela
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          )}
                          </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <section className="container mb-16">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-[#05206F]">Apoiador da LEG</h2>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                className="h-10 w-10 rounded-full border border-slate-300 text-slate-600 hover:bg-[#05206F] hover:text-white transition-colors"
                onClick={() => partnersSliderRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
                aria-label="Voltar parceiros"
              >
                <ChevronLeft className="w-4 h-4 mx-auto" />
              </button>
              <button
                className="h-10 w-10 rounded-full border border-slate-300 text-slate-600 hover:bg-[#05206F] hover:text-white transition-colors"
                onClick={() => partnersSliderRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
                aria-label="Avançar parceiros"
              >
                <ChevronRight className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>

          {partners.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm font-bold text-slate-500">Nenhum parceiro cadastrado no momento.</p>
            </div>
          ) : (
            <>
              <div
                ref={partnersSliderRef}
                onMouseEnter={() => setIsPartnersHovered(true)}
                onMouseLeave={() => setIsPartnersHovered(false)}
                className="hidden md:flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {partners.map((partner) => (
                  <article
                    key={`${partner.name}-${partner.logoUrl}`}
                    className="shrink-0 w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="h-24 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 p-3">
                      <img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-wide truncate">{partner.name}</p>
                  </article>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 md:hidden">
                {partners.map((partner) => (
                  <article key={`mobile-${partner.name}-${partner.logoUrl}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="h-20 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-2 p-2">
                      <img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-wide truncate">{partner.name}</p>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <SiteFooter
        footerLogoUrl={footerLogoUrl}
        modalities={modalitiesInOrder}
        modalityLabelByKey={Object.fromEntries(modalitiesInOrder.map((mod) => [mod, MODALITY_CONFIG[mod]?.label ?? mod]))}
        onHomeClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onAboutClick={() => document.getElementById("sobre")?.scrollIntoView({ behavior: "smooth" })}
        onNewsClick={() => scrollToSection("noticias")}
        onModalityClick={scrollToModality}
      />
    </div>
  );
}
