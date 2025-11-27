
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import type { Language } from '../types';

// Directly import translation files to ensure they are bundled by Vite
// This fixes the issue where fetch fails on Vercel if files aren't in the public folder
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
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass'
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

  const getSystemSettings = (): Partial<Settings> => {
    try {
        const stored = localStorage.getItem('app_system_settings');
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to load system settings", e);
        return {};
    }
  };

  const [settings, setSettings] = useState<Settings>(() => {
    const lastLanguage = localStorage.getItem('app_language') as Language;
    const validLanguages: Language[] = ['zh-TW', 'en', 'zh-CN', 'ja'];
    const systemSettings = getSystemSettings();

    return {
      ...defaultSettings,
      ...systemSettings,
      language: validLanguages.includes(lastLanguage) ? lastLanguage : defaultSettings.language,
    };
  });

  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  // Use state initialized with imports
  const [translations, setTranslations] = useState(defaultTranslations);

  // Removed useEffect fetch block because we are importing JSONs directly.
  // This ensures languages are always available immediately after build.

  const getStorageKey = useCallback(() => {
    if (!currentUser) return null;
    return `user_settings_${currentUser.email}`;
  }, [currentUser]);

  useEffect(() => {
    const systemSettings = getSystemSettings();
    const storageKey = getStorageKey();
    if (storageKey) {
      try {
        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          // Check if parsed language is valid, otherwise fallback
          if (!defaultTranslations.hasOwnProperty(parsedSettings.language)) {
              parsedSettings.language = defaultSettings.language;
          }
          SYSTEM_KEYS.forEach(key => { delete parsedSettings[key]; });
          
          const newSettings = { ...defaultSettings, ...parsedSettings, ...systemSettings };
          if (parsedSettings.apiKey) newSettings.apiKey = parsedSettings.apiKey;
          setSettings(newSettings); 
          if (parsedSettings.language) localStorage.setItem('app_language', parsedSettings.language);
        } else {
          const newSettings = { ...defaultSettings, ...systemSettings, language: settings.language, theme: settings.theme };
          setSettings(newSettings);
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
      }
    } else {
      const lastLanguage = localStorage.getItem('app_language') as Language || defaultSettings.language;
      setSettings(prev => ({
        ...defaultSettings,
        ...systemSettings,
        language: lastLanguage,
        theme: prev.theme,
        font: prev.font,
      }));
    }
  }, [currentUser, getStorageKey]);
  
  useEffect(() => {
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
  }, [settings.theme]);

  useEffect(() => {
    const body = window.document.body;
    body.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-kai', 'font-cursive');
    switch (settings.font) {
      case 'serif': body.classList.add('font-serif'); break;
      case 'mono': body.classList.add('font-mono'); break;
      case 'kai': body.classList.add('font-kai'); break;
      case 'cursive': body.classList.add('font-cursive'); break;
      case 'sans': default: body.classList.add('font-sans'); break;
    }
  }, [settings.font]);

  const saveSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
        const sanitizedNewSettings = { ...newSettings };
        (Object.keys(sanitizedNewSettings) as Array<keyof Settings>).forEach(key => {
             if (typeof sanitizedNewSettings[key] === 'string') {
                 (sanitizedNewSettings as any)[key] = (sanitizedNewSettings[key] as string).trim();
             }
        });

        const updatedSettings = { ...prev, ...sanitizedNewSettings };
        let hasSystemUpdate = false;
        const systemUpdates: Partial<Settings> = {};

        SYSTEM_KEYS.forEach(key => {
             if (key in sanitizedNewSettings) {
                 (systemUpdates as any)[key] = sanitizedNewSettings[key];
                 hasSystemUpdate = true;
             }
        });

        if (hasSystemUpdate && currentUser?.role === '管理員') {
            try {
                const currentSystem = getSystemSettings();
                const newSystem = { ...currentSystem, ...systemUpdates };
                localStorage.setItem('app_system_settings', JSON.stringify(newSystem));
            } catch (e) {
                console.error("Failed to save system settings", e);
            }
        }

        const storageKey = getStorageKey();
        if (storageKey) {
             try {
                const userSaveObject: Partial<Settings> = { ...updatedSettings };
                SYSTEM_KEYS.forEach(key => delete userSaveObject[key]);
                localStorage.setItem(storageKey, JSON.stringify(userSaveObject));
            } catch (e) {
                console.error("Failed to save user settings", e);
            }
        }

        if (updatedSettings.language) {
            localStorage.setItem('app_language', updatedSettings.language);
        }

        return updatedSettings;
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
            translation = translation.replace(new RegExp(`{{${rKey}}}`, 'g'), replacements[rKey]);
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
