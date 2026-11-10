import type { GymSettings, Tenant } from '../types';
import { getActiveTenantId } from '../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-settings';
const TENANTS_STORAGE_KEY = 'gymmanager-tenants';

export const THEME_PRESETS: Record<
  GymSettings['themePreset'],
  { name: string; primary: string; hover: string }
> = {
  emerald: { name: 'Verde Esmeralda', primary: '#10b981', hover: '#059669' },
  indigo: { name: 'Índigo Moderno', primary: '#6366f1', hover: '#4f46e5' },
  blue: { name: 'Azul Oceano', primary: '#3b82f6', hover: '#2563eb' },
  crimson: { name: 'Vermelho Crimson', primary: '#ef4444', hover: '#dc2626' },
  amber: { name: 'Dourado / Âmbar', primary: '#f59e0b', hover: '#d97706' },
  pink: { name: 'Rosa / Magenta', primary: '#ec4899', hover: '#db2777' },
  cyan: { name: 'Ciano Neon', primary: '#06b6d4', hover: '#0891b2' },
  custom: { name: 'Personalizado', primary: '#10b981', hover: '#059669' },
};

export const DEFAULT_SETTINGS: GymSettings = {
  gymName: 'GymManager',
  logoUrl: '',
  primaryColor: '#10b981',
  themePreset: 'emerald',
};

function adjustColorBrightness(hex: string, percent: number): string {
  try {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return hex;

    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));

    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

export const settingsService = {
  getSettings(): GymSettings {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: GymSettings): GymSettings {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    this.applyThemeColor(settings.primaryColor);

    // Sync with active tenant if present
    const activeTenantId = getActiveTenantId();
    if (activeTenantId) {
      try {
        const rawTenants = localStorage.getItem(TENANTS_STORAGE_KEY);
        if (rawTenants) {
          const tenants = JSON.parse(rawTenants) as Tenant[];
          const idx = tenants.findIndex(t => t.id === activeTenantId);
          if (idx !== -1) {
            tenants[idx] = {
              ...tenants[idx],
              name: settings.gymName || tenants[idx].name,
              settings: { ...settings, gymName: settings.gymName || tenants[idx].name },
            };
            localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
          }
        }
      } catch {
        // ignore storage sync error
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gymmanager:settings-updated', { detail: settings }));
    }

    return settings;
  },

  applyThemeColor(color: string): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const darker = adjustColorBrightness(color, -18);
    const darkest = adjustColorBrightness(color, -32);
    const lighter = adjustColorBrightness(color, 25);

    root.style.setProperty('--accent', color);
    root.style.setProperty('--accent-hover', darker);
    root.style.setProperty('--color-brand-500', color);
    root.style.setProperty('--color-brand-400', lighter);
    root.style.setProperty('--color-brand-600', darker);
    root.style.setProperty('--brand-500', color);

    // Apply dynamic gradients across whole app
    const dynamicBrandGradient = `linear-gradient(135deg, ${color} 0%, ${darker} 60%, ${darkest} 100%)`;
    const dynamicHeroGradient = `linear-gradient(160deg, #0a0f1a 0%, #0f172a 45%, ${darkest}88 80%, ${color}44 100%)`;
    const dynamicTextGradient = `linear-gradient(135deg, ${color} 0%, ${lighter} 100%)`;

    root.style.setProperty('--brand-gradient', dynamicBrandGradient);
    root.style.setProperty('--hero-gradient', dynamicHeroGradient);
    root.style.setProperty('--text-gradient', dynamicTextGradient);
  },
};
