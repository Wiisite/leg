import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ChevronLeft, Plus, Trash2, Edit2, X, Shield, ExternalLink, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type SchoolFormState = {
  id?: number;
  name: string;
  slug: string;
  shortName: string;
  city: string;
  primaryColor: string;
  description: string;
  logo: string | null;
  autoLinkTeams: boolean;
};

const EMPTY_FORM: SchoolFormState = {
  name: "",
  slug: "",
  shortName: "",
  city: "",
  primaryColor: "#1e3a8a",
  description: "",
  logo: null,
  autoLinkTeams: true,
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export default function AdminColegios() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: schools, refetch } = trpc.school.list.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SchoolFormState>(EMPTY_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [loading, isAuthenticated, navigate]);

  const upsert = trpc.school.upsert.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.linkedCount
          ? `Colégio salvo! ${data.linkedCount} equipe(s) vinculada(s) automaticamente.`
          : "Colégio salvo!",
      );
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setSlugManuallyEdited(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeSchool = trpc.school.delete.useMutation({
    onSuccess: () => { toast.success("Colégio removido."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSlugManuallyEdited(false);
    setModalOpen(true);
  };

  const openEdit = (s: NonNullable<typeof schools>[number]) => {
    setForm({
      id: s.id,
      name: s.name,
      slug: s.slug,
      shortName: s.shortName ?? "",
      city: s.city ?? "",
      primaryColor: s.primaryColor ?? "#1e3a8a",
      description: s.description ?? "",
      logo: s.logo ?? null,
      autoLinkTeams: false,
    });
    setSlugManuallyEdited(true);
    setModalOpen(true);
  };

  const handleLogoUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo muito grande. Máximo 5MB.");
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Informe o nome do colégio.");
    upsert.mutate({
      id: form.id,
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      shortName: form.shortName.trim() || null,
      city: form.city.trim() || null,
      primaryColor: form.primaryColor,
      description: form.description.trim() || null,
      logo: form.logo,
      autoLinkTeams: form.autoLinkTeams,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border/50 sticky top-0 z-40 bg-white/80 backdrop-blur-md">
        <div className="container flex items-center h-16">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="mr-4">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-black text-base uppercase tracking-tight">Colégios</h1>
          <div className="ml-auto">
            <Button onClick={openCreate} className="bg-red text-white font-black uppercase text-[10px]">
              <Plus className="w-4 h-4 mr-1" />
              Novo Colégio
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {!schools?.length ? (
          <div className="py-16 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
            <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Nenhum colégio cadastrado ainda.</p>
            <Button onClick={openCreate} className="mt-4 bg-red text-white font-black uppercase text-[10px]">
              <Plus className="w-4 h-4 mr-1" /> Cadastrar o primeiro
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((s) => (
              <div
                key={s.id}
                className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-2xl bg-slate-50 border-2 flex items-center justify-center overflow-hidden shrink-0"
                    style={{ borderColor: s.primaryColor || "#e2e8f0" }}
                  >
                    {s.logo ? (
                      <img src={s.logo} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Shield className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm text-slate-800 uppercase truncate">{s.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      /{s.slug}
                      {s.city ? ` · ${s.city}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 font-black uppercase text-[10px]"
                    onClick={() => openEdit(s)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-black uppercase text-[10px]"
                    onClick={() => window.open(`/colegio/${s.slug}`, "_blank")}
                    title="Abrir página pública"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-black uppercase text-[10px] text-red"
                    onClick={() => {
                      if (confirm(`Excluir o colégio "${s.name}"? As equipes vinculadas ficarão sem colégio.`)) {
                        removeSchool.mutate({ id: s.id });
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-black text-2xl text-slate-800 uppercase tracking-tight mb-6">
              {form.id ? "Editar Colégio" : "Novo Colégio"}
            </h3>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-[120px_1fr] gap-4 items-start">
                <label className="cursor-pointer">
                  <div
                    className="w-30 h-30 aspect-square rounded-2xl bg-slate-50 border-2 border-dashed flex items-center justify-center overflow-hidden hover:bg-slate-100 transition-all"
                    style={{ borderColor: form.primaryColor }}
                  >
                    {form.logo ? (
                      <img src={form.logo} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Shield className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-[10px] font-bold uppercase">Logo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoUpload(f);
                    }}
                  />
                </label>

                <div className="space-y-3">
                  <Field label="Nome do colégio*">
                    <input
                      value={form.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setForm((f) => ({
                          ...f,
                          name: newName,
                          slug: slugManuallyEdited ? f.slug : slugify(newName),
                        }));
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                      placeholder="Colégio Canadá"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Slug (URL)">
                      <input
                        value={form.slug}
                        onChange={(e) => {
                          setSlugManuallyEdited(true);
                          setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                        placeholder="canada"
                      />
                    </Field>
                    <Field label="Sigla">
                      <input
                        value={form.shortName}
                        onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.slice(0, 20) }))}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        placeholder="CDA"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Cidade">
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    placeholder="Guarulhos"
                  />
                </Field>
                <Field label="Cor principal">
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      value={form.primaryColor}
                      onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="flex-1 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold resize-none"
                  placeholder="Breve descrição que aparece na página pública do colégio..."
                />
              </Field>

              {!form.id && (
                <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoLinkTeams}
                    onChange={(e) => setForm((f) => ({ ...f, autoLinkTeams: e.target.checked }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Vincular equipes existentes pelo nome
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      O sistema procura equipes em todos os torneios cujo nome bate com este colégio
                      (ex.: "Colégio Canadá") e vincula automaticamente. Você pode ajustar depois.
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={upsert.isPending}
                className="flex-1 bg-red text-white font-black uppercase text-[10px]"
              >
                {upsert.isPending ? "Salvando..." : form.id ? "Salvar alterações" : "Criar colégio"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      {children}
    </div>
  );
}
