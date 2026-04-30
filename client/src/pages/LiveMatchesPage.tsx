import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ExternalLink, LogOut, Radio, ShieldAlert, Tv2 } from "lucide-react";
import { useLocation } from "wouter";

function youtubeEmbedUrl(url: string) {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return `https://www.youtube.com/embed/${watchId}`;

      const pathSegments = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = pathSegments.findIndex((segment) => segment === "embed");
      if (embedIndex >= 0 && pathSegments[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${pathSegments[embedIndex + 1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default function LiveMatchesPage() {
  const { isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();

  const streams = siteSettings?.liveStreams ?? [];

  return (
    <div className="min-h-screen bg-[#F0F2F6] text-slate-900">
      <SiteHeader />

      <main className="container py-10 md:py-14 space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-[#0B173D] via-[#1A2A66] to-[#0B173D] text-white p-6 md:p-8 shadow-[0_20px_35px_rgba(11,23,61,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.2em] font-black text-red-200 mb-2">Transmissão oficial</p>
          <h2 className="text-2xl md:text-4xl font-black leading-tight max-w-3xl">
            Acompanhe as transmissões da LEG em tempo real
          </h2>
          <p className="mt-3 text-white/85 max-w-3xl text-sm md:text-base">
            Os links abaixo são configurados no painel administrativo e podem ser atualizados para cada rodada.
          </p>
        </section>

        {streams.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-xl font-black text-slate-700">Nenhuma transmissão cadastrada</h3>
            <p className="mt-2 text-sm text-slate-500">
              A equipe administrativa pode incluir links no painel em <strong>Configurações do Site → Jogos ao vivo</strong>.
            </p>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-2">
            {streams.map((stream, index) => {
              const embedUrl = youtubeEmbedUrl(stream.youtubeUrl);
              return (
                <article key={`${stream.title}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] font-black text-red-500">Ao vivo</p>
                      <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{stream.title}</h3>
                    </div>
                    <Radio className="w-5 h-5 text-red-500 shrink-0 mt-1 live-blink" />
                  </div>

                  {embedUrl ? (
                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-black/90 mb-3">
                      <iframe
                        src={embedUrl}
                        title={stream.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-2xl border border-slate-200 bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                      <Tv2 className="w-8 h-8" />
                    </div>
                  )}

                  <a
                    href={stream.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#D50000] hover:text-[#05206F]"
                  >
                    Assistir no YouTube
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
