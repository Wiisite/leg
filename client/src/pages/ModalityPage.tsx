import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ChevronRight, Dumbbell, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useParams } from "wouter";

const MODALITY_CONFIG: Record<string, { label: string; accent: string }> = {
  futsal: { label: "Futsal", accent: "#D50000" },
  basquete: { label: "Basquete", accent: "#CC2A00" },
  volei: { label: "Voleibol", accent: "#D50000" },
  handebol: { label: "Handebol", accent: "#B00000" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-100 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-red-100 text-red-700" },
  final: { label: "Final", color: "bg-amber-100 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-emerald-100 text-emerald-700" },
};

export default function ModalityPage() {
  const params = useParams<{ modality: string }>();
  const [, navigate] = useLocation();
  const modality = String(params?.modality || "").toLowerCase();

  const { data: tournaments } = trpc.tournament.list.useQuery();

  const config = MODALITY_CONFIG[modality];

  const list = useMemo(
    () => (tournaments || []).filter((t) => String(t.modality || "").toLowerCase() === modality),
    [tournaments, modality]
  );

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
      <section className="relative bg-[#D50000] text-white pt-12 pb-14 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
          <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
        </div>

        <div className="container relative">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-red-100 hover:text-white mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Home
          </button>

          <p className="text-xs uppercase tracking-[0.2em] font-bold text-red-100 mb-3">Página da modalidade</p>
          <h1 className="font-black text-4xl md:text-6xl leading-tight" style={{ color: "white" }}>
            {config.label}
          </h1>
        </div>
      </section>

      <main className="container py-12">
        {list.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase tracking-wide text-slate-500">Nenhum torneio ativo em {config.label}</h2>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((t) => {
              const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
              return (
                <article
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="group cursor-pointer rounded-2xl p-5 bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.accent }}>
                      <Dumbbell className="w-6 h-6 text-white" />
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
