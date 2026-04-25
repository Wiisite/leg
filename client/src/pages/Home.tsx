import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Trophy, Plus, ChevronRight, Shield, Swords, Star, LayoutGrid, Activity, Target } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-100 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-purple-100 text-purple-700" },
  final: { label: "Final", color: "bg-amber-100 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-green-100 text-green-700" },
};

const MODALITY_ICONS: Record<string, any> = {
  futsal: Swords,
  basquete: Activity,
  volei: Star,
  handebol: Target,
};

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments } = trpc.tournament.list.useQuery();

  const groupedTournaments = tournaments?.reduce((acc, t) => {
    const mod = t.modality || "outros";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(t);
    return acc;
  }, {} as Record<string, typeof tournaments>);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar Premium */}
      <nav className="bg-slate-900 border-b border-white/5 sticky top-0 z-50 shadow-2xl">
        <div className="container flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1 shadow-lg shadow-white/5 rotate-[-2deg]">
              <img src="/logo.png" alt="LEG" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl text-white tracking-tighter leading-none">LIGA ESCOLAR</span>
              <span className="font-black text-sm text-red-500 tracking-[0.2em] leading-none mt-1">GUARULHENSE</span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate("/admin")}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl h-10 px-6 shadow-xl shadow-red-600/20"
                >
                  Painel Administrativo
                </Button>
                <button
                  onClick={() => logout()}
                  className="text-slate-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Sair
                </button>
              </div>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                variant="ghost"
                className="text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest"
              >
                Área Restrita
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-slate-900 pt-20 pb-40 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600 blur-[200px] rounded-full" />
        </div>
        
        <div className="container relative text-center">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Temporada LEG 2026</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
            Acompanhe a sua<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-red-500 bg-[length:200%_auto] animate-gradient-x">Modalidade Favorita</span>
          </h1>
          
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12 font-medium">
            Resultados em tempo real, classificações oficiais e toda a emoção do esporte escolar guarulhense em um só lugar.
          </p>

          <div className="flex justify-center gap-4 flex-wrap">
            {Object.keys(MODALITY_ICONS).map((mod) => (
              <Button
                key={mod}
                variant="outline"
                className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white hover:text-slate-900 transition-all font-black text-xs uppercase tracking-widest border-b-4 border-b-white/5 active:translate-y-1"
                onClick={() => {
                  document.getElementById(mod)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                {mod}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="container -mt-24 relative z-10 pb-32">
        {tournaments?.length === 0 ? (
          <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 shadow-2xl">
            <Trophy className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Nenhum torneio ativo no momento</h2>
          </div>
        ) : (
          <div className="space-y-32">
            {groupedTournaments && Object.entries(groupedTournaments).map(([mod, list]) => {
              const Icon = MODALITY_ICONS[mod] || LayoutGrid;
              return (
                <div key={mod} id={mod} className="scroll-mt-32">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 rounded-[24px] bg-red-600 flex items-center justify-center shadow-2xl shadow-red-600/30 rotate-3">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{mod}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-8 h-1 bg-red-600 rounded-full" />
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{list.length} Torneios Ativos</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((t) => {
                      const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                      return (
                        <div
                          key={t.id}
                          onClick={() => navigate(`/tournament/${t.id}`)}
                          className="group cursor-pointer bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-[3] transition-transform duration-700" />
                          
                          <div className="relative">
                            <div className="flex items-center justify-between mb-8">
                              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform">
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-2 leading-[1.1] group-hover:text-red-600 transition-colors uppercase">
                              {t.name}
                            </h3>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{t.category}</p>

                            {t.champion ? (
                              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
                                  <Trophy className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <span className="block text-[8px] font-black text-amber-900/40 uppercase tracking-widest">Campeão Atual</span>
                                  <span className="block text-xs font-black text-amber-900 uppercase leading-none mt-0.5">{t.champion}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group-hover:gap-4 transition-all">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Ver Classificação</span>
                                <ChevronRight className="w-4 h-4 text-red-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Pro */}
      <footer className="bg-slate-900 pt-32 pb-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 border-b border-white/5 pb-16 mb-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1">
                <img src="/logo.png" alt="LEG" className="w-full h-full object-contain" />
              </div>
              <div className="text-left">
                <span className="block font-black text-white text-lg leading-none">LIGA ESCOLAR</span>
                <span className="block font-black text-red-500 text-xs tracking-widest leading-none mt-1 uppercase">Guarulhense</span>
              </div>
            </div>

            <div className="flex gap-8">
              {Object.keys(MODALITY_ICONS).map(mod => (
                <button key={mod} className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                  {mod}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em]">© 2026 LIGA ESCOLAR GUARULHENSE - Todos os direitos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
