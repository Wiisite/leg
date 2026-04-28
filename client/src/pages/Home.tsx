import { useAuth } from "@/_core/hooks/useAuth";
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
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const { data: tournaments } = trpc.tournament.list.useQuery();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const mainLogoUrl = siteSettings?.mainLogoUrl?.trim() ? siteSettings.mainLogoUrl : "/logo.png";
  const footerLogoUrl = siteSettings?.footerLogoUrl?.trim() ? siteSettings.footerLogoUrl : mainLogoUrl;
  const partners = siteSettings?.partners ?? [];

  const groupedTournaments = useMemo(() => {
    return tournaments?.reduce((acc, t) => {
      const mod = t.modality || "outros";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(t);
      return acc;
    }, {} as Record<string, typeof tournaments>);
  }, [tournaments]);

  const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];
  const modalitiesWithTournaments = useMemo(
    () => modalitiesInOrder.filter((m) => (groupedTournaments?.[m]?.length || 0) > 0),
    [groupedTournaments]
  );

  const scrollToModality = (modality: string) => {
    document.getElementById(modality)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  const heroSlides = useMemo<HeroSlide[]>(() => {
    const featured = modalitiesInOrder
      .map((modality) => groupedTournaments?.[modality]?.[0])
      .filter(Boolean) as NonNullable<typeof tournaments>;

    if (featured.length === 0) {
      return [
        {
          id: "hero-futsal",
          badge: "DESTAQUE DA TEMPORADA",
          title: "5ª COPA LEG DE FUTSAL",
          description: "Acompanhe jogos, classificação e os melhores momentos da principal modalidade da LEG.",
          cta: "Acessar modalidade",
          imageUrl: HERO_IMAGE_BY_MODALITY.futsal,
          onClick: () => navigate("/modalidade/futsal"),
        },
        {
          id: "hero-volei",
          badge: "NOVIDADE",
          title: "2ª COPA LEG DE VOLEIBOL",
          description: "Confira os destaques da rodada e acesse rapidamente a página da competição.",
          cta: "Ver detalhes",
          imageUrl: HERO_IMAGE_BY_MODALITY.volei,
          onClick: () => navigate("/modalidade/volei"),
        },
      ];
    }

    return featured.map((tournament) => {
      const modalityLabel = MODALITY_CONFIG[tournament.modality]?.label ?? "Modalidade";
      const statusLabel = STATUS_LABELS[tournament.status]?.label ?? "Em andamento";
      return {
        id: `hero-${tournament.id}`,
        badge: `${modalityLabel} • ${tournament.category}`,
        title: tournament.name.toUpperCase(),
        description: `Status atual: ${statusLabel}. Acesse a página para acompanhar tabela, partidas e classificações.`,
        cta: "Acessar página",
        imageUrl: HERO_IMAGE_BY_MODALITY[tournament.modality] ?? HERO_IMAGE_BY_MODALITY.futsal,
        onClick: () => navigate(`/tournament/${tournament.id}`),
      };
    });
  }, [groupedTournaments, navigate]);

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const onScroll = () => setIsHeaderShrunk(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const slideSports = (direction: "left" | "right") => {
    if (!sliderRef.current) return;
    const amount = Math.max(280, sliderRef.current.clientWidth * 0.7);
    sliderRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

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
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-red-100 transition-colors">Home</button>
              <button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Notícia</button>
              <button onClick={() => document.getElementById("modalidades")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Modalidade</button>
            </nav>

            <div className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${isHeaderShrunk ? "top-[76%]" : "top-[88%]"}`}>
              <div className={`drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)] transition-all duration-300 ${isHeaderShrunk ? "w-24 h-24 md:w-28 md:h-28" : "w-36 h-36 md:w-44 md:h-44"}`}>
                <img src={mainLogoUrl} alt="Logo LEG" className="w-full h-full object-contain" />
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
              <button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Clínicas</button>
              <button onClick={() => document.getElementById("sobre")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Quem Somos</button>
              <button onClick={() => document.getElementById("rodape")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Contato</button>
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
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-left">Home</button>
                <button onClick={() => document.getElementById("modalidades")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Modalidades</button>
                <button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Torneios</button>
                <button onClick={() => document.getElementById("rodape")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Contato</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative bg-[#D50000] text-white pt-32 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-20 -right-20 h-80 w-80 border border-white/15 rounded-full" />
          <div className="absolute -top-28 -left-10 h-72 w-72 border border-white/15 rounded-full" />
          <div className="absolute top-0 right-16 h-full w-36 bg-[#BC0000] skew-x-[-26deg] opacity-35" />
        </div>

        <div className="relative">
          <div className="relative w-full overflow-hidden border-y border-white/30 min-h-[390px] md:min-h-[500px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] bg-[#9E0000]">
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
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      <footer id="rodape" className="mt-20 bg-[#05206F] text-white pt-12 pb-8">
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-300 to-transparent opacity-80 mb-10" />

        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] border-b border-white/15 pb-10">
            <div id="sobre">
              <div className="flex items-center gap-3 mb-4">
                <img src={footerLogoUrl} alt="Logo LEG rodapé" className="w-12 h-12 rounded-lg bg-white p-1 object-contain" />
                <div>
                  <p className="font-black text-2xl leading-none">LIGA ESCOLAR</p>
                  <p className="font-black text-xs tracking-[0.2em] text-red-200">GUARULHENSE</p>
                </div>
              </div>
              <p className="text-sm text-blue-100/85 max-w-sm mb-4">
                Receba novidades de competições, resultados e notícias de eventos escolares de Guarulhos.
              </p>

              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="E-mail"
                  className="flex-1 h-10 px-3 rounded-md text-slate-900 bg-white"
                />
                <Button className="h-10 px-5 bg-[#D50000] hover:bg-[#BB0000] text-white font-black uppercase tracking-wider">Enviar</Button>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Sobre</h4>
              <ul className="space-y-2 text-sm text-blue-100/85">
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</button></li>
                <li><button onClick={() => document.getElementById("sobre")?.scrollIntoView({ behavior: "smooth" })}>Sobre nós</button></li>
                <li><button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })}>Notícias</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Modalidades</h4>
              <ul className="space-y-2 text-sm text-blue-100/85">
                {modalitiesInOrder.map((mod) => (
                  <li key={mod}>
                    <button onClick={() => scrollToModality(mod)}>{MODALITY_CONFIG[mod]?.label ?? mod}</button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Contato</h4>
              <ul className="space-y-2 text-sm text-blue-100/85">
                <li>Fale conosco</li>
                <li>Contato comercial</li>
                <li>Seja um parceiro</li>
              </ul>

              <div className="mt-5 rounded-xl bg-white/10 border border-white/15 p-3 text-xs">
                <p className="font-black uppercase tracking-wider mb-1">Parceiros</p>
                {partners.length === 0 ? (
                  <p className="text-blue-100/80">Nenhum parceiro cadastrado</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    {partners.map((partner) => (
                      <div
                        key={`${partner.name}-${partner.logoUrl}`}
                        className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5"
                      >
                        <img
                          src={partner.logoUrl}
                          alt={partner.name}
                          className="h-5 w-5 rounded bg-white p-0.5 object-contain"
                        />
                        <span className="text-[11px] text-blue-100/90">{partner.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-blue-100/80">
            <p>© Liga Escolar Guarulhense 2026. Todos os direitos reservados.</p>
            <p className="font-semibold">Facebook • Youtube • Instagram</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
