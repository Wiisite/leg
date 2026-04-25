import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Trophy, Plus, ChevronRight, Shield, Users, Calendar, Star } from "lucide-react";
import { useEffect } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando", color: "bg-slate-100 text-slate-600" },
  group_stage: { label: "Fase de Grupos", color: "bg-blue-50 text-blue-700" },
  semifinals: { label: "Semifinais", color: "bg-purple-50 text-purple-700" },
  final: { label: "Final", color: "bg-amber-50 text-amber-700" },
  finished: { label: "Encerrado", color: "bg-green-50 text-green-700" },
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: tournaments, refetch } = trpc.tournament.list.useQuery();
  const seedMutation = trpc.seed.checkAndSeed.useMutation({
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    seedMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary border-b border-white/10 sticky top-0 z-50 shadow-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red flex items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white tracking-tight">
              LIGA ESCOLAR GUARULHENSE
            </span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user?.name}
                </span>
                <Button
                  size="sm"
                  className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                  onClick={() => navigate("/admin")}
                >
                  <Shield className="w-4 h-4 mr-1.5" />
                  Admin
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-border/60 text-foreground hover:bg-accent"
                onClick={() => (window.location.href = getLoginUrl())}
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.82 0.14 85 / 0.25), transparent)",
          }}
        />
        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/50 text-xs text-muted-foreground mb-6 tracking-widest uppercase">
            <Star className="w-3 h-3 text-gold" />
            Sistema de Gerenciamento de Torneios
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight">
            Plataforma Oficial de Torneios
            <br />
            <span className="text-red">LEG 2026</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Crie torneios completos com fase de grupos, semifinais e final. Acompanhe
            classificações, resultados e o campeão em tempo real.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="bg-red text-white font-bold shadow-brand hover:opacity-90"
                onClick={() => navigate("/create")}
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Torneio
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-red text-white font-bold shadow-brand hover:opacity-90"
                onClick={() => (window.location.href = "/")}
              >
                Começar agora
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              className="border-border/60 text-foreground hover:bg-accent"
              onClick={() => {
                document.getElementById("tournaments")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver torneios
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/40 py-10">
        <div className="container">
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[
              { icon: Trophy, label: "Torneios", value: tournaments?.length ?? 0 },
              { icon: Users, label: "Equipes", value: (tournaments?.length ?? 0) * 6 },
              { icon: Calendar, label: "Partidas", value: (tournaments?.length ?? 0) * 15 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div className="text-3xl font-display font-bold text-gold mb-1">{value}</div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tournament List */}
      <section id="tournaments" className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Torneios</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Acompanhe todos os torneios em andamento
              </p>
            </div>
            {isAuthenticated && (
              <Button
                size="sm"
                className="bg-red text-white font-bold hover:opacity-90 shadow-brand"
                onClick={() => navigate("/create")}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Novo
              </Button>
            )}
          </div>

          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl">
              <Trophy className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum torneio encontrado</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => {
                const status = STATUS_LABELS[t.status] ?? STATUS_LABELS.pending;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/tournament/${t.id}`)}
                    className="group text-left bg-card border border-border/50 rounded-2xl p-6 hover:border-red/40 hover:shadow-brand transition-all duration-300 shadow-premium"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-red flex items-center justify-center shadow-brand group-hover:scale-110 transition-transform">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-foreground text-lg leading-snug mb-1">
                      {t.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">{t.category}</p>
                    {t.champion && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-900/20 border border-amber-700/30">
                        <Trophy className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="text-xs text-amber-300 font-medium truncate">
                          {t.champion}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 group-hover:text-red font-bold transition-colors">
                      Ver detalhes
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-red" />
            <span className="font-display font-bold text-white">LEG - LIGA ESCOLAR GUARULHENSE</span>
          </div>
          <p>Sistema oficial de gerenciamento de torneios esportivos escolares de Guarulhos</p>
        </div>
      </footer>
    </div>
  );
}
