import { useState, useEffect, useCallback, useRef } from 'react';
import { setMasterVolume, setMasterEnabled } from '../lib/sounds';
import { THEMES, hexToRgba } from '../lib/themes';

const STORAGE_KEY = 'retrovault-settings';

const defaultSettings = {
  soundVolume: 70,
  soundEnabled: true,
  theme: 'crimson-noir',
  transcriptionLang: 'auto',
  autoSave: true,
  hissEnabled: true,
};

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate legacy themes to crimson-noir
        const legacyThemes = ['midnight', 'rust', 'military', 'noir'];
        if (legacyThemes.includes(parsed.theme)) {
          parsed.theme = 'crimson-noir';
        }
        return { ...defaultSettings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return { ...defaultSettings };
  });

  const saveTimeoutRef = useRef(null);

  // Debounced save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings]);

  // Apply sound settings when they change
  useEffect(() => {
    setMasterVolume(settings.soundVolume);
    setMasterEnabled(settings.soundEnabled);
  }, [settings.soundVolume, settings.soundEnabled]);

  // Apply theme when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const themeObj = THEMES.find(t => t.id === settings.theme) || THEMES[0];
    if (themeObj && themeObj.ambient) {
      document.documentElement.style.setProperty('--ambient-glow', themeObj.ambient);
    }
  }, [settings.theme]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...defaultSettings });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear settings:', e);
    }
  }, []);

  return { settings, updateSetting, resetSettings };
}
