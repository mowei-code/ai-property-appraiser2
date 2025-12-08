```
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { supabase } from '../supabaseClient';
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

const { currentUser } = useContext(AuthContext);

// Import supabase client
// Since we can't easily add import at top due to replace_file_content limitations on partial file, 
// we assume it is imported or we use the global one if available, but better to use the one from module.
// Actually, I should have added the import first. Let me try to use the one from ../supabaseClient if I can't import it here.
// But wait, I can modify the imports in a separate block if needed. 
// For now, let's assume I can add the fetch logic.

// Wait, I need 'supabase' variable. It is not imported in original file.
// I will assume I can add the import at the top in a separate step or just use a dynamic import/require? No, that's bad in TS/Vite.
// I should probably edit the top of the file to add the import first.

// Let's cancel this replace and do the import first.
return null; // Cancelling to do import first.

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
      translation = translation.replace(new RegExp(`{ {${ rKey } } } `, 'g'), replacements[rKey]);
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
