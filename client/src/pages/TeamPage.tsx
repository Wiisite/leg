import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { 
  Trophy, 
  Users, 
  CalendarDays, 
  ChevronLeft, 
  Shield, 
  Target, 
  Star,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/TeamBadge";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const { data: profile, isLoading } = trpc.team.getProfile.useQuery({ id: teamId });
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const { team, athletes, matches } = profile;
  const finishedMatches = matches.filter(m => m.status === 'finished').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const stats = {
    goals: athletes.reduce((acc, a) => acc + (a.goals || 0), 0),
    matches: matches.length,
    athletes: athletes.length
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-4">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
             <TeamBadge team={team} size="sm" />
             <h1 className="font-display text-sm font-black text-primary uppercase tracking-tight">{team.name}</h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-border/40 py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-[40px] bg-white border-2 border-slate-100 shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
              {team.logo ? (
                <img src={team.logo} className="w-full h-full object-contain p-2" />
              ) : (
                <Shield className="w-16 h-16 text-slate-200" />
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <Badge variant="secondary" className="mb-3 bg-red/5 text-red border-red/10 font-bold px-3 py-1 rounded-lg uppercase text-[10px]">
                Perfil da Equipe
              </Badge>
              <h2 className="font-display text-4xl md:text-5xl font-black text-primary leading-tight tracking-tighter uppercase">
                {team.name}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Atletas</p>
                    <p className="text-sm font-black text-slate-700">{stats.athletes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Target className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Gols</p>
                    <p className="text-sm font-black text-slate-700">{stats.goals}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Partidas</p>
                    <p className="text-sm font-black text-slate-700">{stats.matches}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-12">
        <div className="grid lg:grid-cols-[1fr_350px] gap-12">
          {/* Elenco */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 bg-red rounded-full" />
              <h3 className="font-display text-2xl font-black text-primary uppercase tracking-tight">Elenco Oficial</h3>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {athletes.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">Nenhum atleta cadastrado ainda.</p>
                </div>
              ) : (
                athletes.sort((a, b) => (a.number ?? 99) - (b.number ?? 99)).map(a => (
                  <div key={a.id} className="group bg-white border border-slate-100 p-4 rounded-[28px] flex items-center gap-4 hover:shadow-xl hover:border-red/10 transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                      {a.photo ? (
                        <img src={a.photo} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-lg bg-red/5 flex items-center justify-center text-[10px] font-black text-red border border-red/10">{a.number || '—'}</span>
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{a.name}</h4>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                           <Target className="w-3 h-3 text-slate-300" />
                           <span className="text-[10px] font-black text-slate-400 uppercase">{a.goals || 0} GOLS</span>
                        </div>
                        {a.isSuspended && (
                          <Badge className="bg-red text-white text-[8px] font-black uppercase">Suspenso</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Lateral: Últimos Jogos */}
          <aside className="space-y-12">
            <section>
               <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-6 bg-red rounded-full" />
                <h3 className="font-display text-xl font-black text-primary uppercase tracking-tight">Resultados</h3>
              </div>
              <div className="space-y-3">
                {finishedMatches.length === 0 ? (
                   <p className="text-slate-400 text-xs font-bold text-center py-8">Nenhuma partida finalizada.</p>
                ) : (
                  finishedMatches.slice(0, 5).map(m => {
                    const isHome = m.homeTeamId === teamId;
                    const result = m.homeScore! === m.awayScore! ? 'D' : (isHome ? (m.homeScore! > m.awayScore! ? 'W' : 'L') : (m.awayScore! > m.homeScore! ? 'W' : 'L'));
                    return (
                      <div key={m.id} className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                            result === 'W' ? 'bg-emerald-500 text-white' : result === 'L' ? 'bg-red text-white' : 'bg-slate-400 text-white'
                          }`}>
                            {result}
                          </div>
                          <div className="text-xs font-black text-slate-700 uppercase">
                            {isHome ? 'Casa' : 'Fora'} vs {isHome ? 'Equipe' : 'Equipe'}
                          </div>
                        </div>
                        <div className="font-black text-sm text-slate-900">
                          {m.homeScore} × {m.awayScore}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Fair Play (Mocked for now) */}
            <section className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-10">
                 <Award className="w-32 h-32" />
               </div>
               <h3 className="font-display text-lg font-black uppercase tracking-tight mb-2">Fair Play</h3>
               <p className="text-xs text-slate-400 mb-6 font-bold uppercase tracking-widest">Ranking Disciplinar</p>
               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Cartões Amarelos</span>
                    <span className="text-2xl font-black text-amber-400">0</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Cartões Vermelhos</span>
                    <span className="text-2xl font-black text-red">0</span>
                  </div>
               </div>
            </section>
          </aside>
        </div>
      </main>

      <SiteFooter 
        footerLogoUrl={siteSettings?.footerLogoUrl || '/logo.png'} 
        modalities={["futsal", "basquete", "volei", "handebol"]}
        modalityLabelByKey={{futsal: "Futsal", basquete: "Basquete", volei: "Vôlei", handebol: "Handebol"}}
        onModalityClick={(m) => navigate(`/modalidade/${m}`)}
      />
    </div>
  );
}
