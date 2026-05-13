import React, { useEffect, useState } from "react";
import { Check, Image, Moon, Plus, Settings, Sun, Trash2, X } from "lucide-react";
import { Button } from "./index";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImageFile(file, maxWidth, maxHeight, quality = 0.84, mimeType = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = reject;
      image.onload = () => {
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (mimeType === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  statusOptions = [],
  onAddStatusOption,
  onUpdateStatusOption,
  onRemoveStatusOption,
}) {
  const [logoPreview, setLogoPreview] = useState(settings.logo);
  const [headerImagePreview, setHeaderImagePreview] = useState(settings.headerImage);
  const [faviconPreview, setFaviconPreview] = useState(settings.favicon);

  useEffect(() => {
    setLogoPreview(settings.logo);
    setHeaderImagePreview(settings.headerImage);
    setFaviconPreview(settings.favicon);
  }, [settings.logo, settings.headerImage, settings.favicon]);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    const dataUrl = await resizeImageFile(file, 500, 220, 0.88, "image/png");
    setLogoPreview(dataUrl);
    onSettingsChange({ ...settings, logo: dataUrl });
  };

  const handleHeaderImageUpload = async (file) => {
    if (!file) return;
    const dataUrl = await resizeImageFile(file, 1400, 420, 0.82, "image/jpeg");
    setHeaderImagePreview(dataUrl);
    onSettingsChange({ ...settings, headerImage: dataUrl });
  };

  const handleFaviconUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".ico")) {
      alert("Selecione um arquivo .ico para o ícone da aba.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setFaviconPreview(dataUrl);
    onSettingsChange({ ...settings, favicon: dataUrl });
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    onSettingsChange({ ...settings, logo: null });
  };

  const handleRemoveHeaderImage = () => {
    setHeaderImagePreview(null);
    onSettingsChange({ ...settings, headerImage: null });
  };

  const handleRemoveFavicon = () => {
    setFaviconPreview(null);
    onSettingsChange({ ...settings, favicon: null });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="theme-panel w-full max-w-2xl overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] p-6">
          <h2 className="text-2xl font-bold">Configurações</h2>
          <button onClick={onClose} className="btn-ghost rounded-full p-2" title="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">Tema</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onSettingsChange({ ...settings, theme: "light" })}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${
                  settings.theme === "light" ? "btn-primary" : "btn-outline"
                }`}
              >
                <Sun className="h-4 w-4" />
                Claro
              </button>
              <button
                onClick={() => onSettingsChange({ ...settings, theme: "dark" })}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all ${
                  settings.theme === "dark" ? "btn-primary" : "btn-outline"
                }`}
              >
                <Moon className="h-4 w-4" />
                Escuro
              </button>
            </div>
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">Logo</label>
            <div className="rounded-xl border-2 border-dashed border-[var(--field-border)] p-4">
              {logoPreview ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div
                      className={
                        settings.theme === "light" && settings.logoFrame
                          ? "flex h-24 min-w-32 items-center justify-center rounded-2xl border border-white/80 bg-white px-5 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                          : "flex h-20 items-center justify-center"
                      }
                    >
                      <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-48 object-contain" />
                    </div>
                  </div>
                  <label className="theme-subpanel flex cursor-pointer items-center justify-between rounded-xl border p-3">
                    <span>
                      <span className="block text-sm font-semibold">Quadro atrás da logo</span>
                      <span className="theme-muted block text-xs">Aplicado somente no tema claro</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.logoFrame)}
                      disabled={settings.theme !== "light"}
                      onChange={(e) =>
                        onSettingsChange({ ...settings, logoFrame: e.target.checked })
                      }
                      className="h-5 w-5 accent-[var(--accent-color)] disabled:opacity-40"
                    />
                  </label>
                  <button
                    onClick={handleRemoveLogo}
                    className="w-full rounded-lg bg-red-50 py-2 font-medium text-red-600 hover:bg-red-100"
                  >
                    Remover logo
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-center">
                    <Image className="mx-auto mb-2 h-8 w-8 text-[var(--accent-color)]" />
                    <p className="theme-muted text-sm">Clique para adicionar logo</p>
                    <p className="theme-soft mt-1 text-xs">PNG, JPG (máx. 2MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">
              Imagem de cabeçalho
            </label>
            <div className="rounded-xl border-2 border-dashed border-[var(--field-border)] p-4">
              {headerImagePreview ? (
                <div className="space-y-3">
                  <img
                    src={headerImagePreview}
                    alt="Header preview"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={handleRemoveHeaderImage}
                    className="w-full rounded-lg bg-red-50 py-2 font-medium text-red-600 hover:bg-red-100"
                  >
                    Remover imagem
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-center">
                    <Image className="mx-auto mb-2 h-8 w-8 text-[var(--accent-color)]" />
                    <p className="theme-muted text-sm">
                      Clique para adicionar imagem de cabeçalho
                    </p>
                    <p className="theme-soft mt-1 text-xs">PNG, JPG (máx. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleHeaderImageUpload(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">
              Ícone da aba (.ico)
            </label>
            <div className="rounded-xl border-2 border-dashed border-[var(--field-border)] p-4">
              {faviconPreview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={faviconPreview}
                      alt="Favicon preview"
                      className="h-10 w-10 rounded object-contain"
                    />
                    <span className="theme-muted text-sm">Ícone aplicado na aba da página</span>
                  </div>
                  <button
                    onClick={handleRemoveFavicon}
                    className="w-full rounded-lg bg-red-50 py-2 font-medium text-red-600 hover:bg-red-100"
                  >
                    Remover ícone
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-center">
                    <Image className="mx-auto mb-2 h-8 w-8 text-[var(--accent-color)]" />
                    <p className="theme-muted text-sm">Clique para adicionar um arquivo .ico</p>
                    <p className="theme-soft mt-1 text-xs">Recomendado: 32x32 ou 64x64</p>
                  </div>
                  <input
                    type="file"
                    accept=".ico,image/x-icon,image/vnd.microsoft.icon"
                    className="hidden"
                    onChange={(e) => handleFaviconUpload(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">Cor de destaque</label>
            <div className="flex flex-wrap gap-3">
              {[
                { name: "slate", color: "bg-slate-900" },
                { name: "blue", color: "bg-blue-600" },
                { name: "emerald", color: "bg-emerald-600" },
                { name: "purple", color: "bg-purple-600" },
                { name: "red", color: "bg-red-600" },
              ].map((option) => (
                <button
                  key={option.name}
                  onClick={() => onSettingsChange({ ...settings, accentColor: option.name })}
                  className={`h-12 w-12 rounded-lg ${option.color} transition-all ${
                    settings.accentColor === option.name
                      ? "ring-4 ring-[var(--accent-ring)] ring-offset-2 ring-offset-[var(--panel-bg)]"
                      : "hover:scale-105"
                  }`}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          <div className="theme-subpanel rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Status prontos</h3>
                <p className="theme-muted text-xs">
                  Textos que podem ser marcados em cada câmera.
                </p>
              </div>
              <button
                onClick={onAddStatusOption}
                className="btn-outline inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </button>
            </div>

            {statusOptions.length ? (
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <div
                    key={status.id}
                    className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <input
                      className="theme-field w-full rounded-lg border px-3 py-2 text-sm"
                      value={status.label}
                      onChange={(e) => onUpdateStatusOption?.(status.id, e.target.value)}
                      placeholder="Ex: Câmera ok, não será necessária intervenção"
                    />
                    <button
                      className="btn-ghost inline-flex h-9 items-center justify-center rounded-lg px-3"
                      onClick={() => onRemoveStatusOption?.(status.id)}
                      title="Remover status"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="theme-muted text-sm">Nenhum status pronto cadastrado.</p>
            )}
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">
              Título da aplicação
            </label>
            <input
              type="text"
              value={settings.appTitle}
              onChange={(e) => onSettingsChange({ ...settings, appTitle: e.target.value })}
              className="theme-field w-full rounded-lg border px-4 py-2"
              placeholder="Ex: Checklist de Câmeras"
            />
          </div>

          <div>
            <label className="theme-label mb-3 block text-sm font-semibold">Descrição</label>
            <textarea
              value={settings.appDescription}
              onChange={(e) => onSettingsChange({ ...settings, appDescription: e.target.value })}
              className="theme-field min-h-20 w-full rounded-lg border px-4 py-2"
              placeholder="Ex: Controle de conformidade, imagens e relatório em PDF."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--panel-border)] p-6">
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
          <Button onClick={onClose}>
            <Check className="mr-2 h-4 w-4" />
            Salvo
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton({ onClick }) {
  return (
    <button onClick={onClick} className="btn-ghost rounded-full p-3 transition-colors" title="Configurações">
      <Settings className="h-5 w-5" />
    </button>
  );
}
