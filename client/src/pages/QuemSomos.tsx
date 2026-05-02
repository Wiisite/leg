import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trophy, Users, Heart, Target, ChevronRight, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

export default function QuemSomos() {
  const [, navigate] = useLocation();
  const { data: siteSettings } = trpc.site.getSettings.useQuery();
  const sanitize = (url: any) => (typeof url === 'string' && url.includes('localhost')) ? null : url;
  const aboutHeroImageUrl = sanitize(siteSettings?.aboutHeroImageUrl);
  const aboutMissionImageUrl = sanitize(siteSettings?.aboutMissionImageUrl);


  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const metrics = [
    {
      icon: Users,
      value: "1.500+",
      label: "Alunos Atletas",
      description: "Participantes ativos em nossas competições anuais.",
    },
    {
      icon: Heart,
      value: "3.200+",
      label: "Familiares",
      description: "Envolvidos diretamente no apoio aos nossos jovens atletas.",
    },
    {
      icon: Target,
      value: "300+",
      label: "Convidados",
      description: "Média de convidados por rodada de competição.",
    },
    {
      icon: Trophy,
      value: "200+",
      label: "Colaboradores",
      description: "Equipe dedicada à excelência da organização esportiva.",
    },
  ];

  const directors = [
    "Marcelo de Mesquita",
    "Rodrigo Augusto",
    "Rafael Martins",
    "Marcello Cabral",
    "Gilson Del Santo",
  ];

  const modalities = [
    "Futsal", "Basquete", "Voleibol", "Handebol",
    "Vôlei de Praia", "Xadrez", "Tênis de Mesa"
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden min-h-[400px] flex items-center">
        {aboutHeroImageUrl ? (
          <div className="absolute inset-0 z-[-1]">
            <img src={aboutHeroImageUrl} className="w-full h-full object-cover" alt="Hero background" />
            <div className="absolute inset-0 bg-[#07174B]/80" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-primary/5 -z-10" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-red/10 rounded-full blur-3xl" />
          </>
        )}
        
        <div className="container relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className={`text-4xl md:text-6xl font-black leading-tight mb-6 ${aboutHeroImageUrl ? 'text-white' : 'text-primary'}`}>
              Compromisso com o <br />
              <span className="text-red">Esporte Educacional</span>
            </h1>
            <p className={`text-lg md:text-xl leading-relaxed ${aboutHeroImageUrl ? 'text-blue-100/90' : 'text-muted-foreground'}`}>
              A Liga Escolar Guarulhense (LEG) nasceu com o objetivo de se tornar referência esportiva 
              para crianças e adolescentes matriculados nas escolas do município de Guarulhos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative py-20 bg-primary text-white overflow-hidden">
        {aboutMissionImageUrl && (
          <div className="absolute inset-0 z-0">
            <img src={aboutMissionImageUrl} className="w-full h-full object-cover opacity-30" alt="Mission background" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/80" />
          </div>
        )}
        <div className="container relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-black mb-6 uppercase tracking-wider">Nossa Missão</h2>
            <p className="text-blue-100/80 leading-relaxed mb-6">
              Promovemos competições com organização, respeito e oportunidade de sociabilização 
              dentro do ambiente educacional. Acreditamos que o esporte é uma ferramenta 
              fundamental para a formação do caráter e cidadania dos jovens.
            </p>
            <p className="text-blue-100/80 leading-relaxed">
              Através de campeonatos bem estruturados, levamos o espírito de equipe e a 
              superação para além das salas de aula, unindo escolas, alunos e famílias 
              em torno de um propósito saudável.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            {(siteSettings?.aboutClinics && siteSettings.aboutClinics.length > 0) ? siteSettings.aboutClinics.slice(0, 4).map((item: any, idx: number) => (
              <div 
                key={idx} 
                className={`aspect-square rounded-2xl flex items-center justify-center p-6 text-center shadow-2xl relative overflow-hidden group ${
                  idx === 1 ? "bg-red/90" : "bg-white/5 backdrop-blur-md border border-white/10"
                }`}
              >
                {item.imageUrl && (
                  <div className="absolute inset-0 z-0">
                    <img src={item.imageUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" alt={item.title} />
                    <div className={`absolute inset-0 ${idx === 1 ? 'bg-red/40' : 'bg-primary/20'}`} />
                  </div>
                )}
                <span className={`relative z-10 text-sm font-black uppercase tracking-wider ${idx === 1 ? "text-white" : "text-white"}`}>
                  {item.title}
                </span>
              </div>
            )) : null}
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="py-24 container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-primary uppercase tracking-widest mb-4">Números da LEG</h2>
          <div className="w-20 h-1.5 bg-red mx-auto rounded-full" />
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {metrics.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xl hover:shadow-2xl transition-shadow text-center"
            >
              <div className="w-12 h-12 bg-red/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                <item.icon className="w-6 h-6 text-red" />
              </div>
              <div className="text-4xl font-black text-primary mb-2">{item.value}</div>
              <div className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">{item.label}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Directors Section */}
      <section className="py-20 bg-slate-50">
        <div className="container text-center">
          <h2 className="text-3xl font-black text-primary uppercase tracking-widest mb-12">Diretoria LEG</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {directors.map((name, idx) => (
              <div 
                key={idx}
                className="px-6 py-4 bg-white rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-700"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modalities Section */}
      <section className="py-24 container">
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-12 md:p-20">
              <h2 className="text-3xl font-black text-primary uppercase tracking-widest mb-8">Nossas Modalidades</h2>
              <div className="grid grid-cols-2 gap-4">
                {modalities.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-600 font-semibold">
                    <div className="w-2 h-2 bg-red rounded-full" />
                    {m}
                  </div>
                ))}
              </div>
              <Button 
                className="mt-12 bg-red text-white font-black uppercase tracking-widest px-8"
                onClick={() => navigate("/")}
              >
                Ver Campeonatos <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div 
              className="hidden lg:block bg-cover bg-center"
              style={{ backgroundImage: "url(https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80)" }}
            />
          </div>
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
