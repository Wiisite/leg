import { Button } from "@/components/ui/button";
import { ChevronRight, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type ModalityKey = "futsal" | "basquete" | "volei" | "handebol";

const REGULATION_OPTIONS: Array<{ key: ModalityKey; label: string; subtitle: string }> = [
  { key: "futsal", label: "Futsal", subtitle: "Regulamento oficial da modalidade" },
  { key: "basquete", label: "Basquetebol", subtitle: "Regras e critérios do campeonato" },
  { key: "volei", label: "Voleibol", subtitle: "Normas de disputa e pontuação" },
  { key: "handebol", label: "Handebol", subtitle: "Diretrizes da competição" },
];

export default function RegulamentosPage() {
  const [, navigate] = useLocation();
  const [activeModality, setActiveModality] = useState<ModalityKey>("futsal");

  const activeOption = useMemo(
    () => REGULATION_OPTIONS.find((option) => option.key === activeModality) ?? REGULATION_OPTIONS[0],
    [activeModality]
  );

  const fileUrl = `/api/regulamentos/${activeOption.key}`;

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900">
      <header className="sticky top-0 z-30 bg-[#05206F] text-white shadow-lg">
        <div className="container h-16 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-200">Documentação oficial</p>
            <h1 className="text-xl font-black uppercase">Regulamentos</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/")} className="bg-white text-[#05206F] hover:bg-red-50 font-black uppercase text-[11px]">
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Selecionar modalidade</p>
            <div className="space-y-2">
              {REGULATION_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setActiveModality(option.key)}
                  className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
                    option.key === activeModality
                      ? "border-[#D50000] bg-red-50"
                      : "border-slate-200 bg-white hover:border-[#05206F]/30 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase text-slate-900">{option.label}</p>
                      <p className="text-[11px] text-slate-500">{option.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Visualizando</p>
                <h2 className="text-lg font-black uppercase text-[#05206F] truncate">{activeOption.label}</h2>
              </div>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#D50000] hover:text-[#05206F]"
              >
                <FileText className="w-4 h-4" />
                Abrir em nova aba
              </a>
            </div>

            <div className="h-[75vh] min-h-[520px] bg-slate-100">
              <iframe
                key={activeOption.key}
                src={fileUrl}
                title={`Regulamento ${activeOption.label}`}
                className="w-full h-full"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
