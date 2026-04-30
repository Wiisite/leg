import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { LogOut, Menu, Shield, X, Contact, ChevronDown } from "lucide-react";

interface SiteHeaderProps {
  isHome?: boolean;
}

const modalitiesInOrder = ["futsal", "basquete", "volei", "handebol"];
const modalityLabels: Record<string, string> = {
  futsal: "Futsal",
  basquete: "Basquete",
  volei: "Vôlei",
  handebol: "Handebol",
};

export function SiteHeader({ isHome = false }: SiteHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: settings } = trpc.site.getSettings.useQuery();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoTop, setLogoTop] = useState(isHome ? 88 : 50);
  const [logoScale, setLogoScale] = useState(isHome ? 1 : 0.5);

  const mainLogoUrl = settings?.mainLogoUrl || "/logo.png";

  useEffect(() => {
    if (!isHome) {
      setLogoTop(0);
      setLogoScale(0.45);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / 140, 1);
      setLogoTop(88 - progress * 38);
      setLogoScale(1 - progress * 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="bg-[#05206F] text-white">
      <div className="container h-12 flex items-center justify-between text-[13px] font-bold uppercase tracking-[0.12em]">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => handleNav("/contato")}
            className="inline-flex items-center gap-2 hover:text-red-200 transition-colors"
          >
            <Contact className="w-3.5 h-3.5" />
            Fale Conosco
          </button>
          <span className="opacity-70 hidden sm:inline border-l border-white/20 pl-6">Bem-vindo à LEG 2026</span>
        </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate("/admin")}
                  className="h-8 px-3.5 bg-white text-[#05206F] hover:bg-red-50 text-[11px] font-black rounded-md"
                >
                  Painel Admin
                </button>
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-1.5 hover:text-red-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => navigate("/login")} className="hover:text-red-200 transition-colors">
                  Login
                </button>
                <button onClick={() => (window.location.href = getLoginUrl())} className="hover:text-red-200 transition-colors">
                  Cadastro
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    <header className="sticky top-0 z-50">
      {/* Main Nav Bar */}
      <div className="relative bg-[#D50000] text-white overflow-visible shadow-xl">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <div className="absolute -left-16 top-0 h-full w-48 bg-[#B80000] skew-x-[-30deg]" />
          <div className="absolute -right-16 top-0 h-full w-52 bg-[#B80000] skew-x-[-30deg]" />
        </div>

        <div className="container relative h-24 flex items-center justify-between">
          <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
            <button onClick={() => handleNav("/")} className="hover:text-red-100 transition-colors">Home</button>
            <button onClick={() => handleNav("/clinicas")} className="hover:text-red-100 transition-colors">Clínicas</button>
            <button onClick={() => handleNav("/quem-somos")} className="hover:text-red-100 transition-colors">Quem Somos</button>
          </nav>

          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 pointer-events-none"
            style={{ top: `${logoTop}%` }}
          >
            <div
              className="w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_16px_34px_rgba(0,0,0,0.42)] origin-center transition-transform duration-150 pointer-events-auto cursor-pointer"
              style={{ transform: `scale(${logoScale})` }}
              onClick={() => handleNav("/")}
            >
              <img src={mainLogoUrl} alt="Logo LEG" className="w-full h-full object-contain" />
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-[14px] font-black uppercase tracking-[0.14em]">
            <div className="relative group">
              <button className="inline-flex items-center gap-1 hover:text-red-100 transition-colors">
                Modalidades
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <div className="min-w-[200px] rounded-xl border border-white/30 bg-[#C80000] shadow-xl p-2">
                  {modalitiesInOrder.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleNav(`/modalidade/${m}`)}
                      className="w-full text-left px-3 py-2 rounded-lg text-[12px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/15 transition-colors"
                    >
                      {modalityLabels[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => handleNav("/regulamentos")} className="hover:text-red-100 transition-colors">Regulamentos</button>
            <button onClick={() => handleNav("/contato")} className="hover:text-red-100 transition-colors text-red-100">Contato</button>
            <button
              onClick={() => handleNav("/ao-vivo")}
              className="live-blink inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-200/90 bg-gradient-to-r from-[#FF3B30] via-[#D50000] to-[#A60000] text-white shadow-[0_0_16px_rgba(255,69,58,0.45)] hover:scale-[1.03] transition-all"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
              Ao Vivo
            </button>
          </nav>

          <button
            className="lg:hidden h-10 w-10 rounded-lg border border-white/40 flex items-center justify-center"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/20 bg-[#C80000]">
            <div className="container py-4 flex flex-col gap-3 text-[13px] font-black uppercase tracking-[0.12em]">
              <button onClick={() => handleNav("/")} className="text-left">Home</button>
              <button onClick={() => handleNav("/clinicas")} className="text-left">Clínicas</button>
              <button onClick={() => handleNav("/quem-somos")} className="text-left">Quem Somos</button>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-100 mb-2">Modalidades</p>
                <div className="flex flex-col gap-1.5">
                  {modalitiesInOrder.map((m) => (
                    <button
                      key={`mob-${m}`}
                      onClick={() => handleNav(`/modalidade/${m}`)}
                      className="text-left px-2 py-1.5 rounded text-[12px] font-black uppercase tracking-[0.12em] text-white hover:bg-white/15"
                    >
                      {modalityLabels[m]}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => handleNav("/regulamentos")} className="text-left">Regulamentos</button>
              <button onClick={() => handleNav("/contato")} className="text-left">Contato</button>
              <button
                onClick={() => handleNav("/ao-vivo")}
                className="live-blink inline-flex items-center gap-2 text-left px-3 py-1.5 rounded-full border border-amber-200/90 bg-gradient-to-r from-[#FF3B30] via-[#D50000] to-[#A60000] w-fit"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-amber-200" />
                Ao Vivo
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
