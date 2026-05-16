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
              <Button 
                onClick={() => checkDb()} 
                disabled={diagQuery.isFetching}
                className="bg-red hover:bg-red/90 text-white font-black px-8 h-14 rounded-2xl shadow-lg shadow-red/20 transition-all flex items-center gap-2"
              >
                {diagQuery.isFetching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Executar Verificação
              </Button>
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
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 opacity-50">
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mb-4">
                  <span className="font-black text-slate-400">02</span>
                </div>
                <h4 className="font-bold mb-2">Cadastro Teste</h4>
                <p className="text-slate-400 text-xs">Criar uma área aqui mesmo para cadastrar um atleta fictício.</p>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 opacity-50">
                <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center mb-4">
                  <span className="font-black text-slate-400">03</span>
                </div>
                <h4 className="font-bold mb-2">Lançamento Súmula</h4>
                <p className="text-slate-400 text-xs">Testar um evento de partida (ex: cartão amarelo).</p>
              </div>
            </div>
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
