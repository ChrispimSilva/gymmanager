import { useState, useRef } from 'react';
import {
  Palette,
  Building2,
  Image,
  Check,
  RotateCcw,
  Sparkles,
  Upload,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { THEME_PRESETS } from '../services/settingsService';
import type { GymSettings } from '../types';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [gymName, setGymName] = useState(settings.gymName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [useUrlInput, setUseUrlInput] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<GymSettings['themePreset']>(settings.themePreset);
  const [customColor, setCustomColor] = useState(settings.primaryColor);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectPreset = (presetKey: GymSettings['themePreset']) => {
    setSelectedPreset(presetKey);
    const color = THEME_PRESETS[presetKey].primary;
    setCustomColor(color);
  };

  // Handle Logo file selection (PNG, JPG, SVG from gallery/device)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('A imagem da logomarca deve ter no máximo 2.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoUrl(base64);
      toast.success('Logomarca PNG carregada com sucesso!', 'Imagem Carregada');
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Logomarca removida.');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      updateSettings({
        gymName: gymName.trim() || 'GymManager',
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: customColor,
        themePreset: selectedPreset,
      });
      toast.success('Configurações de identidade visual salvas!', 'Sucesso');
    } catch {
      toast.error('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const def = resetSettings();
    setGymName(def.gymName);
    setLogoUrl(def.logoUrl || '');
    setSelectedPreset(def.themePreset);
    setCustomColor(def.primaryColor);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Configurações restauradas para o padrão.', 'Padrões Restaurados');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Configurações da Academia
        </h1>
        <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          Personalize o nome, logomarca PNG e identidade visual do seu sistema
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding Info Section */}
        <div
          className="rounded-3xl p-5 sm:p-6 border shadow-sm space-y-5"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Identidade & Marca
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Dados exibidos no cabeçalho, posts do Instagram, tela de login e relatórios
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Gym Name */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Nome da Academia *
              </label>
              <input
                type="text"
                required
                value={gymName}
                onChange={e => setGymName(e.target.value)}
                placeholder="Ex: Iron Force Academia"
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Gym Logo PNG Upload / Selection */}
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Logomarca da Academia (PNG da Galeria / Arquivo)
              </label>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoFileUpload}
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                className="hidden"
              />

              {logoUrl ? (
                /* Logo Preview & Management */
                <div
                  className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl border flex items-center justify-center p-2 bg-slate-900/50 shadow-inner flex-shrink-0">
                      <img
                        src={logoUrl}
                        alt="Logomarca da Academia"
                        className="w-full h-full object-contain"
                        onError={() => toast.error('Erro ao renderizar imagem da logomarca')}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        Logomarca Carregada
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                        Pronta para exibição no sistema e posts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Alterar PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3.5 py-2 rounded-xl border text-xs font-bold text-red-500 hover:bg-red-500/10 border-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      title="Remover Logomarca"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sm:hidden">Remover</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Select File Button */
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-4 rounded-2xl border-2 border-dashed hover:border-brand-500 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Image className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        Clique para buscar imagem PNG na galeria / arquivos
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        Recomendado: PNG com fundo transparente (máx. 2.5MB)
                      </p>
                    </div>
                  </button>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setUseUrlInput(!useUrlInput)}
                      className="text-[11px] font-semibold text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      {useUrlInput ? 'Ocultar campo de URL' : 'Ou inserir link / URL direta'}
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Direct URL Input */}
              {useUrlInput && !logoUrl && (
                <div className="relative mt-2 animate-fade-in">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/logomarca.png"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 transition-all"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Color Palette & Themes Section */}
        <div
          className="rounded-3xl p-5 sm:p-6 border shadow-sm space-y-5"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)' }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Cor Principal do Tema
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Escolha uma paleta de destaque para botões, badges e gráficos
              </p>
            </div>
          </div>

          {/* Preset Swatches Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.entries(THEME_PRESETS) as [GymSettings['themePreset'], { name: string; primary: string; hover: string }][]).map(
              ([presetKey, preset]) => {
                if (presetKey === 'custom') return null;
                const isSelected = selectedPreset === presetKey;
                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => handleSelectPreset(presetKey)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-brand-500 scale-[1.02] shadow-lg'
                        : 'hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: isSelected ? preset.primary : 'var(--border-color)',
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm"
                      style={{ background: preset.primary }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      {preset.name}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* Custom Hex Color Option */}
          <div
            className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={e => {
                  setCustomColor(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
              />
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Cor Personalizada (Hexadecimal)
                </p>
                <p className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {customColor.toUpperCase()}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-500/10" style={{ color: 'var(--text-secondary)' }}>
              {selectedPreset === 'custom' ? '✨ Custom Selecionado' : 'Clique no seletor para cor livre'}
            </span>
          </div>

          {/* Live Preview Section */}
          <div className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Pré-visualização do Tema
            </p>
            <div
              className="p-4 rounded-2xl border flex flex-wrap items-center gap-3"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
            >
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-default"
                style={{ background: customColor }}
              >
                Botão Principal
              </button>
              <span
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{
                  background: `${customColor}20`,
                  color: customColor,
                }}
              >
                Badge Ativo
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: customColor }}>
                <Sparkles className="w-4 h-4" />
                <span>Texto em Destaque</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar Padrão
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[48px] flex items-center justify-center gap-2"
            style={{ background: customColor }}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
