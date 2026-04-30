import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare, Instagram, Youtube, ArrowLeft, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Contato() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular envio
    setTimeout(() => {
      setLoading(false);
      toast.success("Mensagem enviada com sucesso! Em breve entraremos em contato.");
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

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
      <section className="py-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-red/10 skew-x-12 translate-x-1/2" />
        <div className="container relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight uppercase tracking-wide">
              Fale com a <br />
              <span className="text-red">LEG</span>
            </h1>
            <p className="text-lg text-blue-100/70 leading-relaxed">
              Dúvidas sobre regulamentos, inscrições ou financeiro? Nossa equipe está pronta 
              para ajudar sua escola a participar do maior campeonato escolar de Guarulhos.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 container">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20">
          {/* Info Side */}
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-black text-primary uppercase tracking-widest mb-8">Canais de Contato</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-red/5 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1">E-mail Oficial</h4>
                    <p className="font-bold text-primary">contato@ligaescolarguarulhense.com.br</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-red/5 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1">Telefone / WhatsApp</h4>
                    <p className="font-bold text-primary">(11) 99999-9999</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-red/5 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-red" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-1">Endereço</h4>
                    <p className="font-bold text-primary">Guarulhos, São Paulo - Brasil</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-primary uppercase tracking-widest mb-8">Siga a LEG</h2>
              <div className="flex gap-4">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-red hover:text-white hover:border-red transition-all shadow-sm group"
                >
                  <Instagram className="w-6 h-6" />
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-red hover:text-white hover:border-red transition-all shadow-sm group"
                >
                  <Youtube className="w-6 h-6" />
                </a>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
              <Building2 className="absolute bottom-[-20px] right-[-20px] w-40 h-40 text-white/5" />
              <h4 className="font-black text-lg mb-2">Departamentos</h4>
              <p className="text-sm text-blue-100/70 mb-4">Escolha o setor correto no formulário para agilizar seu atendimento.</p>
              <ul className="text-xs space-y-2 font-bold uppercase tracking-wider text-red">
                <li>• Competições / Tabelas</li>
                <li>• Financeiro / Boletos</li>
                <li>• Parcerias / Marketing</li>
              </ul>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl p-8 md:p-12">
            <h3 className="text-2xl font-black text-primary mb-8 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-red" />
              Envie sua Mensagem
            </h3>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nome Completo</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm focus:bg-white focus:ring-2 focus:ring-red/20 focus:border-red transition-all outline-none"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">E-mail</label>
                  <input 
                    required
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm focus:bg-white focus:ring-2 focus:ring-red/20 focus:border-red transition-all outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Departamento</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl h-14 px-5 text-sm focus:bg-white focus:ring-2 focus:ring-red/20 focus:border-red transition-all outline-none appearance-none">
                  <option>Competições / Geral</option>
                  <option>Financeiro</option>
                  <option>Parcerias e Marketing</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Mensagem</label>
                <textarea 
                  required
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm focus:bg-white focus:ring-2 focus:ring-red/20 focus:border-red transition-all outline-none resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-red text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-brand hover:opacity-90 transition-opacity"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Enviar Mensagem
                    <Send className="w-4 h-4 ml-3" />
                  </>
                )}
              </Button>
            </form>
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
