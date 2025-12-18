import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '../supabaseClient';
import type { Language } from '../types';

// Directly import translation files to ensure they are bundled by Vite
import zhTW from '../locales/zh-TW.json';
import zhCN from '../locales/zh-CN.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';

export interface Settings {
  apiKey: string;
  theme: 'light' | 'dark' | 'system';
  language: Language;
  font: 'sans' | 'serif' | 'mono' | 'kai' | 'cursive';
  // Admin-specific settings
  allowPublicApiKey: boolean;
  publicApiKey: string;
  paypalClientId: string;
  systemEmail: string; // Admin's contact email
  // SMTP Settings for Node.js Backend
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  autoUpdateCacheOnLogin: boolean;
  publishUnit: string;
  publishVersion: string;
  contactEmail: string;
}

const defaultSettings: Settings = {
  apiKey: '',
  theme: 'system',
  language: 'zh-TW',
  font: 'sans',
  allowPublicApiKey: false,
  publicApiKey: '',
  paypalClientId: '',
  systemEmail: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  autoUpdateCacheOnLogin: true,
  publishUnit: '',
  publishVersion: '',
  contactEmail: '',
};

// Initialize with imported data
const defaultTranslations: Record<Language, any> = {
  'zh-TW': zhTW,
  'zh-CN': zhCN,
  'en': en,
  'ja': ja,
};

const SYSTEM_KEYS: (keyof Settings)[] = [
  'paypalClientId', 'publicApiKey', 'allowPublicApiKey', 'systemEmail',
  'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'publishUnit', 'publishVersion', 'contactEmail'
];

interface SettingsContextType {
  settings: Settings;
  isSettingsModalOpen: boolean;
  setSettingsModalOpen: (isOpen: boolean) => void;
  saveSettings: (newSettings: Partial<Settings>) => void;
  getApiKey: () => string | null;
  t: (key: string, replacements?: Record<string, string>) => string;
}

export const SettingsContext = createContext<SettingsContextType>(null!);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useContext(AuthContext);

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [translations, setTranslations] = useState(defaultTranslations);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to merge system settings
  const mergeSystemSettings = (current: Settings, system: any): Settings => {
    const merged = { ...current };
    if (system.paypal_client_id) merged.paypalClientId = system.paypal_client_id;
    if (system.system_email) merged.systemEmail = system.system_email;
    if (system.smtp_host) merged.smtpHost = system.smtp_host;
    if (system.smtp_port) merged.smtpPort = system.smtp_port;
    if (system.smtp_user) merged.smtpUser = system.smtp_user;
    if (system.smtp_pass) merged.smtpPass = system.smtp_pass;
    if (system.publish_unit) merged.publishUnit = system.publish_unit;
    if (system.publish_version) merged.publishVersion = system.publish_version;
    if (system.contact_email) merged.contactEmail = system.contact_email;
    return merged;
  };

  // 1. Initial Load: LocalStorage (User Prefs) + Supabase (System Settings)
  useEffect(() => {
    const initSettings = async () => {
      // A. Load User Preferences from LocalStorage
      let baseSettings = { ...defaultSettings };
      const storageKey = currentUser ? `user_settings_${currentUser.email}` : null;

      try {
        // Load user specific settings first
        if (storageKey) {
          const userStored = localStorage.getItem(storageKey);
          if (userStored) {
            const parsed = JSON.parse(userStored);
            baseSettings = { ...baseSettings, ...parsed };
          }
        }

        // Apply global language choice LAST (to prioritize it over user-specific stale settings)
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang && utilIsLanguage(savedLang)) {
          baseSettings.language = savedLang;
        }
      } catch (e) {
        console.error("Failed to load local settings:", e);
      }

      // B. Fetch System Settings from Supabase (Always fetch to be fresh)
      try {
        const { data: systemData, error } = await supabase
          .from('system_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (systemData) {
          baseSettings = mergeSystemSettings(baseSettings, systemData);
          // Cache system settings locally for offline/faster subsequent loads (optional, but good for UX)
          localStorage.setItem('app_system_settings_cache', JSON.stringify(systemData));
        } else if (!error) {
          // If table exists but empty, try to insert default row 1 (admin only usually, but safe to try)
          // prevent recursion, just leave default
        }
      } catch (err) {
        console.warn("Failed to fetch system settings from DB, using fallback/cache", err);
        // Fallback to cache if DB fails
        const cached = localStorage.getItem('app_system_settings_cache');
        if (cached) {
          baseSettings = mergeSystemSettings(baseSettings, JSON.parse(cached));
        }
      }

      setSettings(baseSettings);
      setIsInitialized(true);
    };

    initSettings();
  }, [currentUser]);

  // Helper type guard
  const utilIsLanguage = (l: string): l is Language => {
    return ['zh-TW', 'en', 'zh-CN', 'ja'].includes(l);
  };

  useEffect(() => {
    if (!isInitialized) return;
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      if (settings.theme === 'dark' || (settings.theme === 'system' && mediaQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.theme, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    const body = window.document.body;
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-kai', 'font-cursive');
    switch (settings.font) {
      case 'serif': body.classList.add('font-serif'); break;
      case 'mono': body.classList.add('font-mono'); break;
      case 'kai': body.classList.add('font-kai'); break;
      case 'cursive': body.classList.add('font-cursive'); break;
      case 'sans': default: body.classList.add('font-sans'); break;
    }
  }, [settings.font, isInitialized]);

  const saveSettings = async (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const sanitized = { ...newSettings };
      // Trim strings
      (Object.keys(sanitized) as Array<keyof Settings>).forEach(key => {
        if (typeof sanitized[key] === 'string') {
          (sanitized as any)[key] = (sanitized[key] as string).trim();
        }
      });

      const updated = { ...prev, ...sanitized };

      // 1. Save User Prefs to LocalStorage
      const storageKey = currentUser ? `user_settings_${currentUser.email}` : null;
      if (storageKey) {
        const userSave = { ...updated };
        SYSTEM_KEYS.forEach(key => delete userSave[key]); // Don't save system keys to user local storage
        localStorage.setItem(storageKey, JSON.stringify(userSave));
      }
      if (updated.language) {
        localStorage.setItem('app_language', updated.language);
      }

      // 2. Save System Settings to Supabase (if Admin and system keys changed)
      const hasSystemUpdates = SYSTEM_KEYS.some(key => key in sanitized);
      if (hasSystemUpdates && currentUser?.role === '管理員') {
        const dbPayload: any = {};
        if (sanitized.paypalClientId !== undefined) dbPayload.paypal_client_id = sanitized.paypalClientId;
        if (sanitized.systemEmail !== undefined) dbPayload.system_email = sanitized.systemEmail;
        if (sanitized.smtpHost !== undefined) dbPayload.smtp_host = sanitized.smtpHost;
        if (sanitized.smtpPort !== undefined) dbPayload.smtp_port = sanitized.smtpPort;
        if (sanitized.smtpUser !== undefined) dbPayload.smtp_user = sanitized.smtpUser;
        if (sanitized.smtpPass !== undefined) dbPayload.smtp_pass = sanitized.smtpPass;
        if (sanitized.publishUnit !== undefined) dbPayload.publish_unit = sanitized.publishUnit;
        if (sanitized.publishVersion !== undefined) dbPayload.publish_version = sanitized.publishVersion;
        if (sanitized.contactEmail !== undefined) dbPayload.contact_email = sanitized.contactEmail;

        dbPayload.updated_at = new Date().toISOString();

        // Fire and forget (or async await if we wanted to show loading)
        supabase.from('system_settings')
          .upsert({ id: 1, ...dbPayload })
          .then(({ error }) => {
            if (error) {
              console.error("Failed to save system settings to DB:", error);
              alert(`系統設定儲存失敗 (DB Error): ${error.message}`);
            } else {
              // Update cache
              const cached = localStorage.getItem('app_system_settings_cache')
                ? JSON.parse(localStorage.getItem('app_system_settings_cache')!)
                : {};
              localStorage.setItem('app_system_settings_cache', JSON.stringify({ ...cached, ...dbPayload }));
            }
          });
      }

      return updated;
    });
  };

  const getApiKey = (): string | null => {
    if (currentUser?.role === '管理員') {
      if (settings.apiKey) return settings.apiKey;
      if (settings.publicApiKey) return settings.publicApiKey;
      return null;
    }
    if (settings.apiKey) return settings.apiKey;
    if (settings.allowPublicApiKey && settings.publicApiKey) {
      return settings.publicApiKey;
    }
    return null;
  };

  const t = useCallback((key: string, replacements?: Record<string, string>): string => {
    const langTranslations = translations[settings.language] || {};
    let translation = langTranslations[key] || key;
    if (replacements) {
      Object.keys(replacements).forEach(rKey => {
        const pattern = new RegExp(`{{${rKey}}}`, 'g');
        translation = translation.replace(pattern, replacements[rKey]);
      });
    }
    return translation;
  }, [settings.language, translations]);

  return (
    <SettingsContext.Provider value={{ settings, isSettingsModalOpen, setSettingsModalOpen, saveSettings, getApiKey, t }}>
      {children}
    </SettingsContext.Provider>
  );
};
