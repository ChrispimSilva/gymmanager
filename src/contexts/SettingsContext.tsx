import { createContext, useContext, useState, useEffect } from 'react';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService';
import type { GymSettings } from '../types';

interface SettingsContextType {
  settings: GymSettings;
  updateSettings: (newSettings: Partial<GymSettings>) => GymSettings;
  resetSettings: () => GymSettings;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GymSettings>(() => settingsService.getSettings());

  useEffect(() => {
    settingsService.applyThemeColor(settings.primaryColor);
  }, [settings.primaryColor]);

  useEffect(() => {
    const handleSettingsEvent = (e: Event) => {
      const custom = e as CustomEvent<GymSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
      } else {
        setSettings(settingsService.getSettings());
      }
    };
    window.addEventListener('gymmanager:settings-updated', handleSettingsEvent);
    return () => window.removeEventListener('gymmanager:settings-updated', handleSettingsEvent);
  }, []);

  const updateSettings = (newSettings: Partial<GymSettings>) => {
    const merged: GymSettings = { ...settings, ...newSettings };
    const saved = settingsService.saveSettings(merged);
    setSettings(saved);
    return saved;
  };

  const resetSettings = () => {
    const reset = settingsService.saveSettings(DEFAULT_SETTINGS);
    setSettings(reset);
    return reset;
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
