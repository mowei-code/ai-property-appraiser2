
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 輔助函式：安全地讀取環境變數 (支援 Vite 與 Node.js/Electron 環境，以及 LocalStorage)
const getEnvVar = (key: string, storageKey?: string): string | undefined => {
  // 1. 優先檢查 Vite 的 import.meta.env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // 忽略存取錯誤
  }

  // 2. 後備檢查 Node.js 的 process.env
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // 忽略存取錯誤
  }

  // 3. 最後檢查 LocalStorage (瀏覽器環境，允許使用者手動輸入)
  try {
    if (storageKey && typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(storageKey);
      if (val && val.trim() !== '') return val.trim();
    }
  } catch (e) { }

  return undefined;
};

// 驗證 URL 格式的輔助函式
const isValidUrl = (urlString: string | undefined): boolean => {
  if (!urlString) return false;
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'app_supabase_url');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'app_supabase_anon_key');

// 嚴格檢查：必須有值、且 URL 格式正確、且不是預設佔位符
export const isSupabaseConfigured = !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  isValidUrl(supabaseUrl);

if (!isSupabaseConfigured) {
  console.warn('[SupabaseClient] Config missing or invalid. App running in disconnected mode.');
  // Log details to help debugging (safe to log URL structure issue, hide Key)
  if (!supabaseUrl) console.warn('Missing URL');
  else if (!isValidUrl(supabaseUrl)) console.warn('Invalid URL format:', supabaseUrl);
  if (!supabaseAnonKey) console.warn('Missing Anon Key');
}

// --- Singleton Pattern Implementation ---
let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;

  if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: { 'x-application-name': 'ai-property-appraiser' },
        }
      });
    } catch (error) {
      console.error('[SupabaseClient] Crash during client creation:', error);
      // Fallback to placeholder to prevent white screen of death
      supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
    }
  } else {
    // 建立一個佔位符，防止未設定時報錯
    supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
