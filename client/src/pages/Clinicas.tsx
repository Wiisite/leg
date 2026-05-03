import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, Trophy, ChevronRight, ArrowLeft, Star, Users, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function Clinicas() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();
  const sanitize = (url: any) => (typeof url === 'string' && url.includes('localhost')) ? null : url;
  const clinicsHeroImageUrl = sanitize(siteSettings?.clinicsHeroImageUrl);


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden min-h-[450px] flex items-center">
        {clinicsHeroImageUrl ? (
          <div className="absolute inset-0 z-0">
            <img src={clinicsHeroImageUrl} className="w-full h-full object-cover" alt="Clinics Hero" />
            <div className="absolute inset-0 bg-slate-900/70" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-[url(https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80)] opacity-20 bg-cover bg-center" />
        )}
        <div className="container relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red/20 text-red border border-red/30 mb-6">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Educação Continuada</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Clínicas no <br />
              <span className="text-red">Esporte</span>
            </h1>
            <p className="text-lg text-blue-100/70 leading-relaxed">
              O projeto "Clínica no Esporte" oferece treinamentos especializados com profissionais renomados 
              para alunos e professores que buscam aprimorar seus conhecimentos técnicos e práticos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro Grid */}
      <section className="py-20 container">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Star, title: "Especialistas", text: "Treinamentos com quem é referência na modalidade." },
            { icon: Users, title: "Networking", text: "Troca de experiências entre atletas e professores." },
            { icon: Calendar, title: "Programação", text: "Eventos planejados ao longo de toda a temporada." },
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center">
                <item.icon className="w-6 h-6 text-red" />
              </div>
              <div>
                <h3 className="font-bold text-primary mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clinics Grid */}
      <section className="py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-primary uppercase tracking-widest mb-4">Nossas Clínicas</h2>
            <div className="w-20 h-1.5 bg-red mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(siteSettings?.clinics && siteSettings.clinics.length > 0) ? siteSettings.clinics.map((clinic: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition-all"
              >
                <div className="h-56 overflow-hidden relative">
                  <img 
                    src={clinic.imageUrl} 
                    alt={clinic.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-5 left-5">
                    <span className="bg-red text-white font-black uppercase text-[10px] tracking-widest px-3 py-1.5 rounded-full">Inscrições Abertas</span>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-primary mb-4 leading-tight">{clinic.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {clinic.description}
                  </p>
                  {clinic.details && clinic.details.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {clinic.details.map((d: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button 
                    className="w-full h-14 bg-red text-white font-black uppercase tracking-widest text-xs shadow-brand hover:opacity-90"
                    onClick={() => navigate("/contato")}
                  >
                    Garantir Vaga
                  </Button>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <GraduationCap className="w-10 h-10" />
                </div>
                <p className="text-slate-400 font-medium">Novas clínicas serão anunciadas em breve.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container">
        <div className="bg-red rounded-[40px] p-10 md:p-20 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-wider">
            Quer levar uma clínica <br /> para sua escola?
          </h2>
          <p className="text-red-100 max-w-2xl mx-auto mb-10 text-lg">
            A LEG organiza clínicas personalizadas conforme a necessidade da sua instituição. 
            Entre em contato com nossa coordenação técnica.
          </p>
          <Button 
            className="bg-white text-red font-black uppercase tracking-widest px-10 h-14 text-sm hover:bg-slate-100"
            onClick={() => navigate("/contato")}
          >
            Falar com a Coordenação
          </Button>
        </div>
      </section>

      <SiteFooter 
        footerLogoUrl="/logo.png" 
        modalities={["futsal", "basquete", "volei", "handebol"]} 
        onHomeClick={() => navigate("/")}
      />
    </div>
  );
}
