import { useAuth } from "@/_core/hooks/useAuth";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowUp, ArrowDown, Trophy, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

function DivisionTable({
  title,
  subtitle,
  rows,
  isAdmin,
  onSetDivision,
}: {
  title: string;
  subtitle: string;
  rows: any[];
  isAdmin: boolean;
  onSetDivision: (schoolName: string, division: 1 | 2) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-slate-50/80 border-y border-slate-100">
              <th className="py-3 px-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
              <th className="py-3 px-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Escola</th>
              <th className="py-3 px-3 text-center text-[10px] font-black text-red uppercase tracking-widest">Total</th>
              <th className="py-3 px-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontuação por campeonato</th>
              {isAdmin && (
                <th className="py-3 px-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Divisão</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.schoolKey}
                className={`hover:bg-slate-50/80 transition-colors ${
                  row.promotionZone ? "bg-emerald-50/35" : row.relegationZone ? "bg-red-50/35" : ""
                }`}
              >
                <td className="py-3 px-3 text-sm font-black text-slate-500">{row.rank}</td>
                <td className="py-3 px-3 text-sm font-black text-slate-800 uppercase">{row.schoolName}</td>
                <td className="py-3 px-3 text-center text-lg font-black text-red">{row.totalPoints}</td>
                <td className="py-3 px-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(row.tournamentPoints || []).map((entry: any) => (
                      <span
                        key={`${row.schoolKey}-${entry.tournamentId}`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                        title={`${entry.tournamentName} (${entry.category}) • ${entry.modality}`}
                      >
                        <span>{entry.tournamentName}</span>
                        <span className="text-slate-400">{entry.awardedPoints} pts</span>
                      </span>
                    ))}
                  </div>
                </td>
                {isAdmin && (
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant={row.division === 1 ? "default" : "outline"}
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => onSetDivision(row.schoolName, 1)}
                      >
                        1ª Div
                      </Button>
                      <Button
                        size="sm"
                        variant={row.division === 2 ? "default" : "outline"}
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => onSetDivision(row.schoolName, 2)}
                      >
                        2ª Div
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ClassificacaoGeral() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: settings } = trpc.site.getSettings.useQuery();
  const { data, isLoading } = trpc.tournament.getOverallStandings.useQuery();

  const setSchoolDivision = trpc.tournament.setSchoolDivision.useMutation({
    onSuccess: () => {
      utils.tournament.getOverallStandings.invalidate();
      utils.site.getSettings.invalidate();
      toast.success("Divisão da escola atualizada.");
    },
    onError: (err) => toast.error(err.message),
  });

  const applyPromotion = trpc.tournament.applyOverallPromotionRelegation.useMutation({
    onSuccess: (payload) => {
      utils.tournament.getOverallStandings.invalidate();
      utils.site.getSettings.invalidate();
      const promotedCount = payload.moved.promoted.length;
      const relegatedCount = payload.moved.relegated.length;
      toast.success(`Acesso/rebaixamento aplicado (${promotedCount} acessos, ${relegatedCount} quedas).`);
    },
    onError: (err) => toast.error(err.message),
  });

  const config = data?.config;
  const season = config?.season ?? settings?.overallStandingsConfig?.season ?? new Date().getFullYear();
  const footerLogoUrl = settings?.footerLogoUrl?.trim()
    ? settings.footerLogoUrl
    : settings?.mainLogoUrl?.trim()
      ? settings.mainLogoUrl
      : "/logo.png";

  const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];
  const modalityLabels: Record<string, string> = {
    futsal: "Futsal",
    basquete: "Basquete",
    volei: "Vôlei",
    handebol: "Handebol",
  };

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900">
      <SiteHeader />

      <main className="container py-8 md:py-10 space-y-6">
        <section className="rounded-3xl border border-[#0A2D78]/15 bg-gradient-to-r from-[#0A2D78] via-[#1649A6] to-[#D50000] p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-100">Temporada {season}</p>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight mt-2">Classificação Geral</h1>
              <p className="text-sm text-blue-100 mt-3 max-w-2xl">
                Atualização automática por resultado lançado em cada campeonato. A tabela mostra líderes, zona de acesso e zona de rebaixamento em tempo real.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wider">
                <Trophy className="w-4 h-4" />
                Líder 1ª: {data?.leaders.firstDivision?.schoolName ?? "A definir"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wider">
                <Trophy className="w-4 h-4" />
                Líder 2ª: {data?.leaders.secondDivision?.schoolName ?? "A definir"}
              </div>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Gestão de divisões e acesso/rebaixamento
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="font-black uppercase tracking-widest text-[11px]"
                  onClick={() => applyPromotion.mutate({ incrementSeason: false })}
                  disabled={applyPromotion.isPending}
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Aplicar sobe/desce agora
                </Button>
                <Button
                  className="bg-red text-white font-black uppercase tracking-widest text-[11px]"
                  onClick={() => applyPromotion.mutate({ incrementSeason: true })}
                  disabled={applyPromotion.isPending}
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Fechar temporada e virar ano
                </Button>
              </div>
            </div>
          </section>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500">
            Carregando classificação geral...
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                Zona de acesso: top {config?.promotionSlots ?? 3} da 2ª divisão
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/40 p-3 text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-2">
                <ArrowDown className="w-4 h-4" />
                Zona de rebaixamento: últimos {config?.relegationSlots ?? 3} da 1ª divisão
              </div>
            </div>

            <DivisionTable
              title="1ª Divisão"
              subtitle="Classificação principal"
              rows={data?.firstDivision ?? []}
              isAdmin={isAdmin}
              onSetDivision={(schoolName, division) => setSchoolDivision.mutate({ schoolName, division })}
            />

            <DivisionTable
              title="2ª Divisão"
              subtitle="Disputa por acesso"
              rows={data?.secondDivision ?? []}
              isAdmin={isAdmin}
              onSetDivision={(schoolName, division) => setSchoolDivision.mutate({ schoolName, division })}
            />
          </>
        )}
      </main>

      <SiteFooter
        footerLogoUrl={footerLogoUrl}
        modalities={modalitiesInOrder}
        modalityLabelByKey={modalityLabels}
      />
    </div>
  );
}
