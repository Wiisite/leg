import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { GraduationCap, Trophy, ChevronRight, ArrowLeft, Star, Users, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Clinicas() {
  const [, navigate] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const clinics = [
    {
      title: "Arbitragem de Vôlei de Praia",
      description: "Capacitação técnica para árbitros e interessados nas regras oficiais da modalidade na areia.",
      image: "https://images.unsplash.com/photo-1612872086822-48b6a421670f?auto=format&fit=crop&w=800&q=80",
      details: ["Regras Oficiais", "Posicionamento", "Sinalização"],
    },
    {
      title: "Xadrez Educacional",
      description: "Clínicas focadas no desenvolvimento do raciocínio lógico e estratégias aplicadas ao ambiente escolar.",
      image: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
      details: ["Aberturas", "Finais de Jogo", "Tática"],
    },
    {
      title: "Futsal de Alto Rendimento",
      description: "Treinamentos específicos com treinadores experientes para aprimorar a técnica individual e coletiva.",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
      details: ["Fundamentos", "Sistemas de Jogo", "Goleiros"],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Fixo Simples */}
      <header className="bg-primary text-white py-4 sticky top-0 z-50 shadow-md">
        <div className="container flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
          <div className="font-black text-xl tracking-tighter">
            LEG <span className="text-red">2026</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url(https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80)] opacity-20 bg-cover bg-center" />
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

          <div className="grid md:grid-cols-3 gap-8">
            {clinics.map((clinic, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={clinic.image} 
                    alt={clinic.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-white font-black uppercase text-xs tracking-widest">Inscrições Abertas</span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-primary mb-3">{clinic.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {clinic.description}
                  </p>
                  <div className="space-y-2 mb-8">
                    {clinic.details.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <div className="w-1 h-1 bg-red rounded-full" />
                        {d}
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full bg-primary text-white font-bold text-xs py-5"
                    onClick={() => navigate("/contato")}
                  >
                    Mais Informações
                  </Button>
                </div>
              </motion.div>
            ))}
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
