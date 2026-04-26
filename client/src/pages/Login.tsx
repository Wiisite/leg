import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Shield, Lock, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [code, setCode] = useState("");
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.loginWithCode.useMutation({
    onSuccess: () => {
      toast.success("Acesso autorizado!");
      utils.auth.me.invalidate();
      setLocation("/admin");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao tentar acessar");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    loginMutation.mutate({ code });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600 blur-[180px] rounded-full opacity-30" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white rounded-3xl mx-auto mb-6 flex items-center justify-center p-2 shadow-xl rotate-[-2deg]">
              <img src="/logo.png" alt="LEG" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Área Administrativa</h1>
            <p className="text-slate-400 text-sm font-medium">Insira o código de acesso para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código de Acesso"
                  className="w-full h-16 bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <Button
              disabled={loginMutation.isPending || !code}
              className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 active:translate-y-1 transition-all disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-10 flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <Shield className="w-4 h-4" />
            Acesso Protegido
          </div>
        </div>

        <button
          onClick={() => setLocation("/")}
          className="w-full mt-8 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          Voltar para o Início
        </button>
      </div>
    </div>
  );
}
