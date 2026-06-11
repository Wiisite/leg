import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  Trophy,
  Users,
  CalendarDays,
  ChevronLeft,
  Shield,
  Target,
  Award,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const MODALITY_LABELS: Record<string, string> = {
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Vôlei",
  handebol: "Handebol",
  extra1: "Extra 1",
  extra2: "Extra 2",
};

export default function SchoolPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { data: profile, isLoading, error } = trpc.school.getBySlug.useQuery({ slug: slug ?? "" });
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const groups = useMemo(() => {
    if (!profile) return [] as Array<{
      key: string;
      tournamentId: number;
      tournamentName: string;
      modality: string;
      category: string;
      team: any;
      athletes: any[];
      matches: any[];
      events: any[];
      stats: {
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
        yellowCards: number;
        redCards: number;
      };
    }>;

    return profile.teams.map((team) => {
      const tournament = profile.tournaments.find((t) => t.id === team.tournamentId);
      const teamAthletes = profile.athletes.filter((a) => a.teamId === team.id);
      const teamMatches = profile.matches.filter(
        (m) => m.homeTeamId === team.id || m.awayTeamId === team.id,
      );
      const finishedMatches = teamMatches.filter(
        (m) => m.status === "finished" || m.homeScore !== null || m.awayScore !== null,
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      finishedMatches.forEach((m) => {
        const isHome = m.homeTeamId === team.id;
        const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        const theirScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
        goalsFor += myScore;
        goalsAgainst += theirScore;
        if (myScore > theirScore) wins++;
        else if (myScore < theirScore) losses++;
        else draws++;
      });

      const teamEvents = profile.events.filter((e) => e.teamId === team.id);
      const yellowCards = teamEvents.filter((e) => e.type === "yellow_card").length;
      const redCards = teamEvents.filter((e) => e.type === "red_card").length;

      return {
        key: `${team.id}`,
        tournamentId: team.tournamentId,
        tournamentName: tournament?.name ?? "Torneio",
        modality: tournament?.modality ?? "futsal",
        category: tournament?.category ?? "Geral",
        team,
        athletes: teamAthletes,
        matches: teamMatches,
        events: teamEvents,
        stats: {
          played: finishedMatches.length,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          yellowCards,
          redCards,
        },
      };
    });
  }, [profile]);

  const totals = useMemo(() => {
    if (!profile) return { athletes: 0, matches: 0, goals: 0, modalities: 0 };
    const modalitiesSet = new Set(profile.tournaments.map((t) => t.modality));
    const goals = profile.events.filter((e) =>
      ["goal", "point_1", "point_2", "point_3"].includes(e.type),
    ).length;
    return {
      athletes: profile.athletes.length,
      matches: profile.matches.length,
      goals,
      modalities: modalitiesSet.size,
    };
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <Trophy className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="font-black text-2xl text-slate-700 uppercase">Colégio não encontrado</h1>
        <p className="text-slate-500 mt-2 font-bold text-sm">
          O colégio que você procura ainda não foi cadastrado.
        </p>
        <Button onClick={() => navigate("/")} className="mt-6 bg-red text-white">
          Voltar ao início
        </Button>
      </div>
    );
  }

  const { school } = profile;
  const headerColor = school.primaryColor || "#1e3a8a";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="border-b border-border/50 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-4">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
              {school.logo ? (
                <img src={school.logo} className="w-full h-full object-contain p-0.5" />
              ) : (
                <Shield className="w-4 h-4 text-slate-300" />
              )}
            </div>
            <h1 className="font-display text-sm font-black text-primary uppercase tracking-tight truncate">
              {school.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div
        className="relative border-b border-border/40 py-12 overflow-hidden"
        style={{ backgroundColor: `${headerColor}10` }}
      >
        <div className="container relative">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div
              className="w-36 h-36 rounded-[40px] bg-white border-4 shadow-2xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ borderColor: headerColor }}
            >
              {school.logo ? (
                <img src={school.logo} className="w-full h-full object-contain p-2" />
              ) : (
                <Shield className="w-20 h-20 text-slate-200" />
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <Badge
                variant="secondary"
                className="mb-3 font-bold px-3 py-1 rounded-lg uppercase text-[10px] border"
                style={{ color: headerColor, borderColor: `${headerColor}30`, backgroundColor: `${headerColor}10` }}
              >
                Perfil do Colégio
              </Badge>
              <h2 className="font-display text-4xl md:text-5xl font-black text-primary leading-tight tracking-tighter uppercase">
                {school.name}
              </h2>
              {school.city && (
                <p className="mt-2 flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  {school.city}
                </p>
              )}
              {school.description && (
                <p className="mt-4 text-sm text-slate-600 max-w-2xl leading-relaxed">{school.description}</p>
              )}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <Stat icon={<Trophy className="w-4 h-4 text-amber-600" />} bg="bg-amber-50" label="Modalidades" value={totals.modalities} />
                <Stat icon={<Users className="w-4 h-4 text-blue-600" />} bg="bg-blue-50" label="Atletas" value={totals.athletes} />
                <Stat icon={<CalendarDays className="w-4 h-4 text-emerald-600" />} bg="bg-emerald-50" label="Partidas" value={totals.matches} />
                <Stat icon={<Target className="w-4 h-4 text-red" />} bg="bg-red/5" label="Gols/Pontos" value={totals.goals} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container py-12 space-y-16">
        {groups.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
            <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">
              Este colégio ainda não está vinculado a nenhuma equipe em torneios.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="space-y-6">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-red rounded-full" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {MODALITY_LABELS[g.modality] ?? g.modality} · {g.category}
                    </p>
                    <h3 className="font-display text-xl font-black text-primary uppercase tracking-tight">
                      {g.tournamentName}
                    </h3>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-black uppercase text-[10px]"
                  onClick={() => navigate(`/torneio/${g.tournamentId}`)}
                >
                  Ver torneio
                </Button>
              </div>

              {/* Estatísticas resumidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <StatBlock label="Jogos" value={g.stats.played} />
                <StatBlock label="V" value={g.stats.wins} color="text-emerald-600" />
                <StatBlock label="E" value={g.stats.draws} color="text-slate-500" />
                <StatBlock label="D" value={g.stats.losses} color="text-red" />
                <StatBlock label="GP" value={g.stats.goalsFor} />
                <StatBlock label="GC" value={g.stats.goalsAgainst} />
                <StatBlock label="Y" value={g.stats.yellowCards} color="text-amber-500" />
                <StatBlock label="R" value={g.stats.redCards} color="text-red" />
              </div>

              {/* Elenco */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Elenco</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {g.athletes.length === 0 ? (
                    <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 font-bold text-xs">Nenhum atleta cadastrado.</p>
                    </div>
                  ) : (
                    g.athletes
                      .slice()
                      .sort((a: any, b: any) => (a.number ?? 99) - (b.number ?? 99))
                      .map((a: any) => {
                        const athleteEvents = g.events.filter((e: any) => e.athleteId === a.id);
                        const goals = athleteEvents.filter((e: any) =>
                          ["goal", "point_1", "point_2", "point_3"].includes(e.type),
                        ).length;
                        const yellows = athleteEvents.filter((e: any) => e.type === "yellow_card").length;
                        const reds = athleteEvents.filter((e: any) => e.type === "red_card").length;
                        const susp2min = athleteEvents.filter((e: any) => e.type === "suspension_2min").length;
                        return (
                          <div
                            key={a.id}
                            className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center gap-3 hover:shadow-md transition-all"
                          >
                            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                              {a.photo ? (
                                <img src={a.photo} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-slate-200" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-red/5 border border-red/10 flex items-center justify-center text-[10px] font-black text-red">
                                  {a.number ?? "—"}
                                </span>
                                <p className="font-black text-xs text-slate-800 uppercase truncate">{a.name}</p>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase flex-wrap">
                                {a.position && <span>{a.position}</span>}
                                <span className="flex items-center gap-1" title="Gols / pontos">
                                  <Target className="w-3 h-3" />
                                  {goals}
                                </span>
                                {yellows > 0 && (
                                  <span
                                    className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-amber-400 text-amber-900 text-[9px] font-black"
                                    title="Cartões amarelos"
                                  >
                                    {yellows}Y
                                  </span>
                                )}
                                {reds > 0 && (
                                  <span
                                    className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded bg-red text-white text-[9px] font-black"
                                    title="Cartões vermelhos"
                                  >
                                    {reds}R
                                  </span>
                                )}
                                {susp2min > 0 && (
                                  <span
                                    className="inline-flex items-center justify-center min-w-[24px] h-4 px-1 rounded bg-blue-600 text-white text-[9px] font-black"
                                    title="Suspensões de 2 minutos"
                                  >
                                    {susp2min}·2M
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </section>
          ))
        )}
      </main>

      <SiteFooter
        footerLogoUrl={siteSettings?.footerLogoUrl || "/logo.png"}
        modalities={["futsal", "basquete", "volei", "handebol"]}
        modalityLabelByKey={{ futsal: "Futsal", basquete: "Basquete", volei: "Vôlei", handebol: "Handebol" }}
        onModalityClick={(m) => navigate(`/modalidade/${m}`)}
      />
    </div>
  );
}

function Stat({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{label}</p>
        <p className="text-sm font-black text-slate-700">{value}</p>
      </div>
    </div>
  );
}

function StatBlock({ label, value, color = "text-slate-700" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-3 py-3 text-center">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
