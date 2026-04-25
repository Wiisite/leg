import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Trophy, ArrowLeft, Plus, Trash2, Shield, Shuffle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TEAM_COLORS = [
  "#1e3a8a", "#166534", "#7c3aed", "#b91c1c", "#d97706", "#0e7490",
  "#be185d", "#065f46", "#1d4ed8", "#9a3412",
];

const DEFAULT_TEAMS = [
  { name: "Colégio Beryon", shortName: "BRY", color: "#1e3a8a" },
  { name: "Colégio Educar", shortName: "EDU", color: "#166534" },
  { name: "Colégio Santa Rita", shortName: "CSR", color: "#7c3aed" },
  { name: "Colégio Marconi", shortName: "MCN", color: "#b91c1c" },
  { name: "Colégio Parthenon", shortName: "PTH", color: "#d97706" },
  { name: "Colégio Canada", shortName: "CDA", color: "#0e7490" },
];

type TeamInput = { name: string; shortName: string; color: string };

export default function CreateTournament() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [modality, setModality] = useState<"futsal" | "basquete" | "volei" | "handebol">("futsal");
  const [pointsPerWin, setPointsPerWin] = useState(3);
  const [pointsPerDraw, setPointsPerDraw] = useState(1);
  const [pointsPerLoss, setPointsPerLoss] = useState(0);
  const [rounds, setRounds] = useState(5);
  const [teams, setTeams] = useState<(TeamInput & { logo?: string })[]>(
    DEFAULT_TEAMS.map(t => ({ ...t, logo: "" }))
  );

  const createMutation = trpc.tournament.create.useMutation({
    onSuccess: (t) => {
      toast.success("Torneio criado com sucesso!");
      navigate(`/tournament/${t.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const addTeam = () => {
    setTeams([...teams, { name: "", shortName: "", color: "#1e3a8a", logo: "" }]);
  };

  const removeTeam = (i: number) => {
    setTeams(teams.filter((_, idx) => idx !== i));
  };

  const updateTeam = (i: number, field: string, value: string) => {
    setTeams(teams.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const handleLogoUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateTeam(index, "logo", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome do torneio");
    if (!category.trim()) return toast.error("Informe a categoria");
    if (teams.length < 2) return toast.error("Adicione pelo menos 2 equipes");
    const invalid = teams.find((t) => !t.name.trim() || !t.shortName.trim());
    if (invalid) return toast.error("Preencha nome e sigla de todas as equipes");
    createMutation.mutate({ 
      name, 
      category, 
      modality, 
      rounds,
      pointsPerWin, 
      pointsPerDraw, 
      pointsPerLoss,
      teams: teams.map(t => ({
        name: t.name,
        shortName: t.shortName,
        color: t.color || "#1e3a8a",
        logo: t.logo
      }))
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold">
            <Shield className="w-8 h-8 text-amber-950" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Faça login para criar novos torneios.
          </p>
          <Button
            className="w-full bg-red text-white font-bold hover:opacity-90 shadow-brand"
            onClick={() => (window.location.href = "/")}
          >
            Acessar Sistema
          </Button>
          <Button
            variant="ghost"
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Admin
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <span className="font-medium text-sm text-foreground">Novo Torneio</span>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Criar Torneio
          </h1>
          <p className="text-muted-foreground">
            Configure as informações do torneio e cadastre as equipes participantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <h2 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              Informações do Torneio
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome do Torneio
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sub-9 MASC"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Sub-9 Masculino"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Modalidade
                </label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="futsal">Futsal</option>
                  <option value="basquete">Basquete</option>
                  <option value="volei">Vôlei</option>
                  <option value="handebol">Handebol</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Número de Rodadas
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Vitória (Pts)
                  </label>
                  <input
                    type="number"
                    value={pointsPerWin}
                    onChange={(e) => setPointsPerWin(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Empate (Pts)
                  </label>
                  <input
                    type="number"
                    value={pointsPerDraw}
                    onChange={(e) => setPointsPerDraw(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Derrota (Pts)
                  </label>
                  <input
                    type="number"
                    value={pointsPerLoss}
                    onChange={(e) => setPointsPerLoss(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-premium">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-gold" />
                Equipes Participantes ({teams.length})
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-border/60 hover:border-gold/50 hover:text-gold text-xs font-bold uppercase"
                onClick={addTeam}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Equipe
              </Button>
            </div>
            <div className="space-y-4">
              {teams.map((team, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border/30"
                >
                  {/* Logo Upload */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-xl bg-white border-2 border-dashed border-border/60 flex items-center justify-center overflow-hidden shadow-sm transition-colors group-hover:border-gold/50">
                      {team.logo ? (
                        <img src={team.logo} className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Plus className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">Logo</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-xl">
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleLogoUpload(i, e.target.files[0])}
                      />
                      <Plus className="w-5 h-5 text-white" />
                    </label>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeam(i, "name", e.target.value)}
                      placeholder="Nome do Colégio / Equipe"
                      className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold min-w-0"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={team.shortName}
                        onChange={(e) =>
                          updateTeam(i, "shortName", e.target.value.toUpperCase().slice(0, 10))
                        }
                        placeholder="Sigla"
                        className="w-24 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs text-center font-black tracking-widest"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red shrink-0 h-10 w-10 p-0"
                        onClick={() => removeTeam(i)}
                        disabled={teams.length <= 2}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {teams.length < 2 && (
              <p className="text-xs text-destructive mt-3">
                Adicione pelo menos 2 equipes para criar o torneio.
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-secondary/20 border border-border/30 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Resumo do torneio
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-display font-bold text-gold">{teams.length}</div>
                <div className="text-xs text-muted-foreground">Equipes</div>
              </div>
              <div>
                <div className="text-xl font-display font-bold text-gold">
                  {(teams.length * (teams.length - 1)) / 2}
                </div>
                <div className="text-xs text-muted-foreground">Partidas (grupos)</div>
              </div>
              <div>
                <div className="text-xl font-display font-bold text-gold">
                  {(teams.length * (teams.length - 1)) / 2 + 3}
                </div>
                <div className="text-xs text-muted-foreground">Total de partidas</div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border/60"
              onClick={() => navigate("/admin")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gradient-gold text-amber-950 font-semibold hover:opacity-90 shadow-gold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-amber-950 border-t-transparent animate-spin mr-2" />
              ) : (
                <Trophy className="w-4 h-4 mr-2" />
              )}
              Criar Torneio
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
