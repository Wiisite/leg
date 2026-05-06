import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

type SiteFooterProps = {
  footerLogoUrl: string;
  modalities: string[];
  modalityLabelByKey?: Record<string, string>;
  onHomeClick?: () => void;
  onAboutClick?: () => void;
  onNewsClick?: () => void;
  onModalityClick?: (modality: string) => void;
};

export function SiteFooter({
  footerLogoUrl,
  modalities,
  modalityLabelByKey,
  onHomeClick,
  onAboutClick,
  onNewsClick,
  onModalityClick,
}: SiteFooterProps) {
  const [, navigate] = useLocation();
  const rightsHolderLogoUrl = "/images/rw-sports-logo.png";

  const handleHomeClick = () => {
    if (onHomeClick) return onHomeClick();
    navigate("/");
  };

  const handleAboutClick = () => {
    if (onAboutClick) return onAboutClick();
    navigate("/quem-somos");
  };

  const handleNewsClick = () => {
    if (onNewsClick) return onNewsClick();
    navigate("/clinicas");
  };

  const handleContactClick = () => {
    navigate("/contato");
  };

  const handleModalityClick = (modality: string) => {
    if (onModalityClick) return onModalityClick(modality);
    window.location.href = `/modalidade/${modality}`;
  };

  return (
    <footer id="rodape" className="mt-20 bg-[#05206F] text-white pt-12 pb-8">
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-300 to-transparent opacity-80 mb-10" />

      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] border-b border-white/15 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={footerLogoUrl} alt="Logo LEG rodapé" className="w-12 h-12 rounded-lg bg-white p-1 object-contain" />
              <div>
                <p className="font-black text-2xl leading-none">LIGA ESCOLAR</p>
                <p className="font-black text-xs tracking-[0.2em] text-[#D50000]">GUARULHENSE</p>
              </div>
            </div>
            <p className="text-sm text-blue-100/85 max-w-sm mb-4">
              Receba novidades de competições, resultados e notícias de eventos escolares de Guarulhos.
            </p>

            <div className="flex gap-2 max-w-sm">
              <input
                type="email"
                placeholder="E-mail"
                className="flex-1 h-10 px-3 rounded-md text-slate-900 bg-white"
              />
              <Button className="h-10 px-5 bg-[#D50000] hover:bg-[#BB0000] text-white font-black uppercase tracking-wider">Enviar</Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Sobre</h4>
            <ul className="space-y-2 text-sm text-blue-100/85">
              <li><button onClick={handleHomeClick}>Home</button></li>
              <li><button onClick={handleAboutClick}>Sobre nós</button></li>
              <li><button onClick={handleNewsClick}>Notícias</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Modalidades</h4>
            <ul className="space-y-2 text-sm text-blue-100/85">
              {modalities.map((modality) => (
                <li key={modality}>
                  <button onClick={() => handleModalityClick(modality)}>
                    {modalityLabelByKey?.[modality] ?? modality}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.16em] mb-3">Contato</h4>
            <ul className="space-y-2 text-sm text-blue-100/85">
              <li><button onClick={handleContactClick}>Fale conosco</button></li>
              <li><button onClick={handleContactClick}>Contato comercial</button></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 space-y-4 text-xs text-blue-100/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <p>© Liga Escolar Guarulhense 2026. Todos os direitos reservados.</p>
            <p className="font-semibold">Facebook • Youtube • Instagram</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3">
              <img
                src={rightsHolderLogoUrl}
                alt="Logo RW Sports"
                className="h-14 w-auto rounded-md bg-white/5 p-1 object-contain"
              />
              <p className="text-sm font-bold text-white">Empresa detentora dos direitos LEG</p>
            </div>

            <a
              href="https://wiisite.com.br/"
              target="_blank"
              rel="noreferrer"
              className="text-base font-semibold text-blue-100 hover:text-white transition-colors"
            >
              Projetado e desenvolvido por Wiiste Digital
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
