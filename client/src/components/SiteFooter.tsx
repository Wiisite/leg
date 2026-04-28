import { Button } from "@/components/ui/button";

type Partner = {
  name: string;
  logoUrl: string;
};

type SiteFooterProps = {
  footerLogoUrl: string;
  partners: Partner[];
  modalities: string[];
  modalityLabelByKey?: Record<string, string>;
  onHomeClick?: () => void;
  onAboutClick?: () => void;
  onNewsClick?: () => void;
  onModalityClick?: (modality: string) => void;
};

export function SiteFooter({
  footerLogoUrl,
  partners,
  modalities,
  modalityLabelByKey,
  onHomeClick,
  onAboutClick,
  onNewsClick,
  onModalityClick,
}: SiteFooterProps) {
  const handleHomeClick = () => {
    if (onHomeClick) return onHomeClick();
    window.location.href = "/";
  };

  const handleAboutClick = () => {
    if (onAboutClick) return onAboutClick();
    window.location.href = "/#sobre";
  };

  const handleNewsClick = () => {
    if (onNewsClick) return onNewsClick();
    window.location.href = "/#torneios";
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
              <li>Fale conosco</li>
              <li>Contato comercial</li>
              <li>Seja um parceiro</li>
            </ul>

            <div className="mt-5 rounded-xl bg-white/10 border border-white/15 p-3 text-xs">
              <p className="font-black uppercase tracking-wider mb-1">Parceiros</p>
              {partners.length === 0 ? (
                <p className="text-blue-100/80">Nenhum parceiro cadastrado</p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {partners.map((partner) => (
                    <div
                      key={`${partner.name}-${partner.logoUrl}`}
                      className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5"
                    >
                      <img
                        src={partner.logoUrl}
                        alt={partner.name}
                        className="h-5 w-5 rounded bg-white p-0.5 object-contain"
                      />
                      <span className="text-[11px] text-blue-100/90">{partner.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-blue-100/80">
          <p>© Liga Escolar Guarulhense 2026. Todos os direitos reservados.</p>
          <p className="font-semibold">Facebook • Youtube • Instagram</p>
        </div>
      </div>
    </footer>
  );
}
