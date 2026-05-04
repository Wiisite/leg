import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LiveMatchesPage from "./pages/LiveMatchesPage";
import ModalityPage from "./pages/ModalityPage";
import TournamentDetail from "./pages/TournamentDetail";
import AdminDashboard from "./pages/AdminDashboard";
import CreateTournament from "./pages/CreateTournament";
import Login from "./pages/Login";
import RegulamentosPage from "./pages/RegulamentosPage";
import QuemSomos from "./pages/QuemSomos";
import Clinicas from "./pages/Clinicas";
import Contato from "./pages/Contato";
import ClassificacaoGeral from "./pages/ClassificacaoGeral";

const DEFAULT_DESCRIPTION = "Liga Escolar Guarulhense: acompanhe campeonatos, tabelas de jogos, resultados e classificacao das modalidades escolares.";

function upsertMeta(selector: string, attrs: Record<string, string>) {
  const existing = document.head.querySelector(selector);
  const element = existing || document.createElement("meta");
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  if (!existing) document.head.appendChild(element);
}

function upsertCanonical(href: string) {
  const existing = document.head.querySelector('link[rel="canonical"]');
  const element = existing || document.createElement("link");
  element.setAttribute("rel", "canonical");
  element.setAttribute("href", href);
  if (!existing) document.head.appendChild(element);
}

function getSeoContent(path: string) {
  if (/^\/torneio\/\d+/.test(path) || /^\/tournament\/\d+/.test(path)) {
    return {
      title: "Torneio | LEG 2026",
      description: "Acompanhe jogos, tabela, classificacao e resultados do campeonato na plataforma oficial da LEG.",
    };
  }

  if (path.startsWith("/modalidade/")) {
    return {
      title: "Modalidade | LEG 2026",
      description: "Veja os torneios ativos por modalidade, com tabela, jogos e classificacao atualizados.",
    };
  }

  if (path === "/admin") {
    return {
      title: "Painel Administrativo | LEG 2026",
      description: "Area administrativa da Liga Escolar Guarulhense para gestao de campeonatos e partidas.",
    };
  }

  if (path === "/ao-vivo") {
    return {
      title: "Jogos Ao Vivo | LEG 2026",
      description: "Acompanhe partidas e atualizacoes em tempo real na plataforma da LEG.",
    };
  }

  return {
    title: "LEG 2026 | Liga Escolar Guarulhense",
    description: DEFAULT_DESCRIPTION,
  };
}

function SeoManager() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { title, description } = getSeoContent(location);
    const canonicalUrl = `${window.location.origin}${location}`;

    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertCanonical(canonicalUrl);
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ao-vivo" component={LiveMatchesPage} />
      <Route path="/login" component={Login} />
      <Route path="/modalidade/:modality" component={ModalityPage} />
      <Route path="/regulamentos" component={RegulamentosPage} />
      <Route path="/torneio/:id" component={TournamentDetail} />
      <Route path="/tournament/:id" component={TournamentDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/create" component={CreateTournament} />
      <Route path="/quem-somos" component={QuemSomos} />
      <Route path="/clinicas" component={Clinicas} />
      <Route path="/contato" component={Contato} />
      <Route path="/classificacao-geral" component={ClassificacaoGeral} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <SeoManager />
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.14 0.018 260)",
                border: "1px solid oklch(0.25 0.02 260)",
                color: "oklch(0.96 0.005 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
