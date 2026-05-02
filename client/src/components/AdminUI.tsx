import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Image as ImageIcon, Plus, MinusCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Utilities ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const toDataUrl = (file: File, maxWidth = 800, quality = 0.4): Promise<string> => {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error(`Arquivo muito grande. Máximo: 10MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB`));
  }
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return Promise.reject(new Error(`Tipo não permitido: ${file.type}. Use JPG, PNG ou WebP.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo inválido ou corrompido."));
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", quality));
      };
    };
  });
};

// ─── Components ───────────────────────────────────────────────────────────────

export const AdminCard = ({ title, children, extra, icon: Icon }: any) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-red" />}
        <h3 className="text-lg font-black uppercase tracking-widest text-slate-900">{title}</h3>
      </div>
      {extra}
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

export const AdminInput = ({ label, ...props }: any) => (
  <div className="space-y-2">
    {label && <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>}
    <input 
      {...props} 
      className={`w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-medium focus:bg-white focus:border-red/20 transition-all outline-none ${props.className || ""}`} 
    />
  </div>
);

export const AdminTextArea = ({ label, ...props }: any) => (
  <div className="space-y-2">
    {label && <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>}
    <textarea 
      {...props} 
      className={`w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:bg-white focus:border-red/20 transition-all outline-none resize-none ${props.className || ""}`} 
    />
  </div>
);

export const ImageUploadField = ({ label, id, currentUrl, fileData, onUpload, onRemove, aspect = "video" }: any) => {
  const preview = fileData || currentUrl;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        {preview && (
          <button onClick={onRemove} className="text-[10px] font-bold text-slate-400 hover:text-red flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Remover
          </button>
        )}
      </div>
      <div className="relative group">
        <input 
          type="file" 
          id={id} 
          accept="image/*" 
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              try {
                const dataUrl = await toDataUrl(file);
                onUpload(dataUrl);
              } catch (err: any) {
                toast.error(err.message || "Erro ao processar imagem.");
                e.target.value = "";
              }
            }
          }}
          className="hidden" 
        />
        <label 
          htmlFor={id} 
          className={`w-full ${aspect === "square" ? "aspect-square" : "h-32"} bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all border-dashed overflow-hidden relative group`}
        >
          {preview ? (
            <>
              <img src={preview} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Upload className="w-6 h-6 text-white" />
              </div>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-slate-200" />
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Escolher Imagem</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
};
