import { useState, useEffect, useCallback, useRef } from 'react';
import { setMasterVolume, setMasterEnabled } from '../lib/sounds';

const STORAGE_KEY = 'retrovault-settings';

const defaultSettings = {
  soundVolume: 70,
  soundEnabled: true,
  theme: 'midnight',
  transcriptionLang: 'auto',
  autoSave: true,
  hissEnabled: true,
};

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
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
