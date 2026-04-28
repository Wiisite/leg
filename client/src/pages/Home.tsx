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
import { useMemo, useRef, useState } from "react";

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
    icon: Swords,
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
    icon: Target,
    accent: "#B00000",
    lightAccent: "#FFECEC",
  },
};

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const { data: tournaments } = trpc.tournament.list.useQuery();

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
          <div className="container h-10 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
            <button className="inline-flex items-center gap-2 hover:text-red-200 transition-colors">
              <Contact className="w-3.5 h-3.5" />
              Fale Conosco
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate("/admin")}
                  className="h-7 px-3 bg-white text-[#05206F] hover:bg-red-50 text-[10px] font-black rounded-md"
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

        <div className="relative bg-[#D50000] text-white overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
            <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
          </div>

          <div className="container relative h-22 flex items-center justify-between">
            <nav className="hidden lg:flex items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em]">
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-red-100 transition-colors">Home</button>
              <button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Notícia</button>
              <button onClick={() => document.getElementById("modalidades")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-red-100 transition-colors">Modalidade</button>
            </nav>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full bg-white shadow-2xl p-2">
                <img src="/logo.png" alt="LEG" className="w-full h-full object-contain" />
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-6 text-[11px] font-black uppercase tracking-[0.18em]">
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
              <div className="container py-4 flex flex-col gap-3 text-[11px] font-black uppercase tracking-wider">
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-left">Home</button>
                <button onClick={() => document.getElementById("modalidades")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Modalidades</button>
                <button onClick={() => document.getElementById("torneios")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Torneios</button>
                <button onClick={() => document.getElementById("rodape")?.scrollIntoView({ behavior: "smooth" })} className="text-left">Contato</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="relative bg-[#D50000] text-white pt-24 pb-32 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-20 -right-20 h-80 w-80 border border-white/15 rounded-full" />
          <div className="absolute -top-28 -left-10 h-72 w-72 border border-white/15 rounded-full" />
          <div className="absolute top-0 right-16 h-full w-36 bg-[#BC0000] skew-x-[-26deg] opacity-35" />
        </div>

        <div className="container relative">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-red-100 mb-4">Torneio e Festivais</p>
          <h1 className="font-black text-4xl md:text-6xl leading-tight mb-5">Torneio em andamento</h1>
          <p className="max-w-2xl text-red-100 text-base md:text-lg mb-10">
            Acompanhe os campeonatos por modalidade com placares atualizados, classificação geral e fases eliminatórias.
          </p>

          <div id="modalidades" className="flex flex-wrap gap-3">
            {(modalitiesWithTournaments.length > 0 ? modalitiesWithTournaments : modalitiesInOrder).map((modality) => (
              <button
                key={modality}
                onClick={() => scrollToModality(modality)}
                className="h-11 px-5 rounded-full bg-white text-[#D50000] hover:bg-[#05206F] hover:text-white transition-all border border-white/40 text-xs font-black uppercase tracking-[0.15em]"
              >
                {MODALITY_CONFIG[modality]?.navLabel ?? modality}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="container -mt-16 relative z-20 mb-16">
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
                    onClick={() => scrollToModality(modality)}
                    className="text-xs font-black uppercase tracking-[0.16em] inline-flex items-center gap-1 text-[#D50000] hover:text-[#05206F]"
                  >
                    Ver Detalhes <ChevronRight className="w-3.5 h-3.5" />
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
                <img src="/logo.png" alt="LEG" className="w-12 h-12 rounded-lg bg-white p-1" />
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
                <p className="text-blue-100/80">APEFI • Wiisite</p>
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
