import { Download, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "leg-pwa-install-dismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    if (!isMobileDevice() || isStandaloneMode()) return;
    if (window.localStorage.getItem(DISMISSED_KEY) === "true") return;

    setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
      window.localStorage.setItem(DISMISSED_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setExpanded(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      window.localStorage.setItem(DISMISSED_KEY, "true");
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    window.localStorage.setItem(DISMISSED_KEY, "true");
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] md:hidden">
      <div className="rounded-2xl border border-white/20 bg-[#05206F] text-white shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D50000]">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.08em]">Instale o app da LEG</p>
            <p className="mt-0.5 text-xs font-semibold text-blue-100">Acesse tabelas, jogos e notícias direto pela tela inicial do celular.</p>
          </div>
          <button onClick={handleDismiss} className="rounded-full p-1 text-blue-100 hover:bg-white/10" aria-label="Fechar aviso de instalação">
            <X className="h-4 w-4" />
          </button>
        </div>

        {(expanded || isIos || !installPrompt) && (
          <div className="border-t border-white/15 px-3 pb-3 text-xs font-semibold text-blue-50">
            {isIos ? (
              <p className="flex gap-2 pt-3">
                <Share2 className="mt-0.5 h-4 w-4 shrink-0" />
                No iPhone, toque em compartilhar e escolha “Adicionar à Tela de Início”.
              </p>
            ) : (
              <p className="pt-3">Se o botão não abrir a instalação, use o menu do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”.</p>
            )}
          </div>
        )}

        <div className="flex gap-2 px-3 pb-3">
          <button onClick={handleInstall} className="flex-1 rounded-xl bg-[#D50000] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg">
            Baixar app
          </button>
          <button onClick={handleDismiss} className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white/90">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
