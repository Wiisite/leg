import { useAuth } from "@/_core/hooks/useAuth";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Trophy,
  ArrowLeft,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Table as TableIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminLab() {
  const { user, isAuthenticated, isLoading: loadingAuth } = useAuth();
  const [, navigate] = useLocation();
  const [dbResult, setDbResult] = useState<any>(null);

  const diagQuery = trpc.system.checkDatabase.useQuery(undefined, {
    enabled: false,
  });

  const checkDb = async () => {
    try {
      const result = await diagQuery.refetch();
      if (result.data) {
        setDbResult(result.data);
        toast.success("Diagnóstico concluído");
      }
    } catch (err: any) {
      toast.error(`Erro ao verificar banco: ${err.message}`);
    }
  };

  const { mutate: forceSync, isPending: syncingDb } = trpc.system.forceSyncDatabase.useMutation({
    onSuccess: (data: any) => {
      if (data.athletesError || data.match_eventsError) {
        toast.error("Erro em algumas tabelas. Veja os detalhes.");
      } else {
        toast.success("Tabelas criadas com sucesso!");
      }
      setDbResult(data);
    },
    onError: (err) => {
      toast.error(`Falha crítica na sincronização: ${err.message}`);
    }
  });

  const { data: testAthletes, refetch: refetchTestAthletes } = trpc.system.listTestAthletes.useQuery();

  const { data: testEvents, refetch: refetchTestEvents } = trpc.system.listTestEvents.useQuery();

  const { data: tournaments } = trpc.tournament.list.useQuery();
  const testRegMutation = trpc.system.testAthleteRegistration.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Atleta cadastrado com sucesso! ID: ${data.athlete?.id}`);
        refetchTestAthletes();
      } else {
        toast.error(`Falha no cadastro: ${data.error}`);
      }
    }
  });

  const testEventMutation = trpc.system.testMatchEvent.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("eventos sumula teste gravando");
        refetchTestEvents();
      } else {
        toast.error(`Falha na súmula: ${data.error}`);
      }
    }
  });

  const runRegistrationTest = () => {
    if (!tournaments || tournaments.length === 0) {
      toast.error("Crie um torneio primeiro para testar");
      return;
    }
    toast.info("Iniciando teste de gravação de atleta...");
    testRegMutation.mutate({ teamId: 1 });
  };

  const runEventTest = () => {
    toast.info("Iniciando teste de súmula...");
    testEventMutation.mutate({ matchId: 1, teamId: 1 });
  };

  const { data: settings } = trpc.site.getSettings.useQuery();

  if (loadingAuth) return null;

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-slate-400 text-sm mb-6">Esta área é restrita a administradores.</p>
          <Button onClick={() => navigate("/")} className="w-full bg-red hover:bg-red/90 text-white font-bold h-12 rounded-xl">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/admin")}
                className="rounded-full hover:bg-slate-50"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <h1 className="font-display text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Database className="w-5 h-5 text-red" />
                Laboratório Administrativo
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="bg-slate-50 border border-slate-100 p-8 rounded-[40px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Diagnóstico de Banco de Dados</h2>
                <p className="text-slate-500 text-sm mt-1">Verifique se as tabelas de atletas e súmula estão prontas para uso.</p>
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={() => checkDb()} 
                  disabled={diagQuery.isFetching}
                  variant="outline"
                  className="border-slate-200 text-slate-600 font-bold px-6 h-14 rounded-2xl transition-all flex items-center gap-2"
                >
                  {diagQuery.isFetching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Verificar
                </Button>
                <Button 
                  onClick={() => forceSync()} 
                  disabled={syncingDb}
                  className="bg-red hover:bg-red/90 text-white font-black px-8 h-14 rounded-2xl shadow-lg shadow-red/20 transition-all flex items-center gap-2"
                >
                  {syncingDb ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Forçar Criação de Tabelas
                </Button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Atenção</p>
                <p className="text-xs text-amber-700">Se as tabelas acima mostrarem "Erro", clique no botão vermelho para tentar criá-las manualmente no banco de dados.</p>
              </div>
            </div>

            {dbResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Atletas */}
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <TableIcon className="w-5 h-5 text-slate-400" />
                      Tabela: athletes
                    </h3>
                    {dbResult.athletes ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red/10 text-red border-red/20 px-3 py-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> Erro
                      </Badge>
                    )}
                  </div>
                  
                  {dbResult.athletesError ? (
                    <div className="p-4 bg-red/5 rounded-xl border border-red/10">
                      <p className="text-red text-xs font-mono break-all">{dbResult.athletesError}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-50">
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coluna</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nulo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Array.isArray(dbResult.athletes) && dbResult.athletes.map((col: any) => (
                            <tr key={col.Field || col.column_name}>
                              <td className="py-2 text-xs font-bold text-slate-700">{col.Field || col.column_name}</td>
                              <td className="py-2 text-xs font-mono text-slate-400 uppercase">{col.Type || col.column_type || col.data_type}</td>
                              <td className="py-2 text-xs text-slate-400">{col.Null || col.is_nullable}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Súmula */}
                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <TableIcon className="w-5 h-5 text-slate-400" />
                      Tabela: match_events
                    </h3>
                    {dbResult.match_events && Array.isArray(dbResult.match_events) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Online
                      </Badge>
                    ) : (
                      <Badge className="bg-red/10 text-red border-red/20 px-3 py-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" /> Erro
                      </Badge>
                    )}
                  </div>
                  
                  {dbResult.match_eventsError ? (
                    <div className="p-4 bg-red/5 rounded-xl border border-red/10">
                      <p className="text-red text-xs font-mono break-all">{dbResult.match_eventsError}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-50">
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Coluna</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nulo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Array.isArray(dbResult.match_events) && dbResult.match_events.map((col: any) => (
                            <tr key={col.Field || col.column_name}>
                              <td className="py-2 text-xs font-bold text-slate-700">{col.Field || col.column_name}</td>
                              <td className="py-2 text-xs font-mono text-slate-400 uppercase">{col.Type || col.column_type || col.data_type}</td>
                              <td className="py-2 text-xs text-slate-400">{col.Null || col.is_nullable}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] text-white">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Próximos Passos (Isolados)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mb-4">
                  <span className="font-black text-slate-400">01</span>
                </div>
                <h4 className="font-bold mb-2">Validar Estrutura</h4>
                <p className="text-slate-400 text-xs">Certificar que as colunas acima batem exatamente com o código.</p>
              </div>
              <button 
                onClick={runRegistrationTest}
                disabled={testRegMutation.isPending}
                className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 hover:border-red/50 transition-all text-left"
              >
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mb-4 text-white">
                  {testRegMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span className="font-black text-slate-400">02</span>}
                </div>
                <h4 className="font-bold mb-2">Cadastro Teste</h4>
                <p className="text-slate-400 text-xs">Clique aqui para tentar cadastrar um atleta fictício e validar a gravação.</p>
              </button>
              <button 
                onClick={runEventTest}
                disabled={testEventMutation.isPending}
                className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 hover:border-red/50 transition-all text-left"
              >
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mb-4 text-white">
                  {testEventMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span className="font-black text-slate-400">03</span>}
                </div>
                <h4 className="font-bold mb-2">Lançamento Súmula</h4>
                <p className="text-slate-400 text-xs">Testar um evento de partida (ex: gol) na nova tabela.</p>
              </button>
            </div>

            {(testAthletes?.length > 0 || testEvents?.length > 0) && (
              <div className="mt-8 space-y-6">
                {testAthletes && testAthletes.length > 0 && (
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Atletas de Teste Gravados:</h4>
                    <div className="flex flex-wrap gap-3">
                      {testAthletes.map((ath) => (
                        <div key={ath.id} className="bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-700/50 flex items-center gap-3">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <span className="text-xs font-mono text-slate-300">ID {ath.id}: {ath.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {testEvents && testEvents.length > 0 && (
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider text-amber-400">Eventos de Súmula Gravados:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {testEvents.map((evt) => (
                        <div key={evt.id} className="bg-slate-900/50 px-4 py-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{evt.type}</p>
                              <p className="text-[10px] text-slate-400">Match ID: {evt.matchId} • Team ID: {evt.teamId}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">#{evt.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter 
        footerLogoUrl={settings?.footerLogoUrl || ""} 
        modalities={["futsal", "basquete", "volei", "handebol"]} 
      />
    </div>
  );
}
