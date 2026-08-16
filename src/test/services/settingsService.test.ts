import { describe, it, expect, beforeEach } from 'vitest';
import { settingsService, DEFAULT_SETTINGS } from '../../services/settingsService';

describe('settingsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default settings when nothing is stored', () => {
    const s = settingsService.getSettings();
    expect(s.gymName).toBe(DEFAULT_SETTINGS.gymName);
    expect(s.primaryColor).toBe(DEFAULT_SETTINGS.primaryColor);
  });

  it('should save and retrieve custom branding settings', () => {
    settingsService.saveSettings({
      gymName: 'Iron Force VIP',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#6366f1',
      themePreset: 'indigo',
    });

    const loaded = settingsService.getSettings();
    expect(loaded.gymName).toBe('Iron Force VIP');
    expect(loaded.primaryColor).toBe('#6366f1');
    expect(loaded.themePreset).toBe('indigo');
  });
});
