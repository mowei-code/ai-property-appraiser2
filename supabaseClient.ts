
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 輔助函式：安全地讀取環境變數 (支援 Vite 與 Node.js/Electron 環境)
const getEnvVar = (key: string): string | undefined => {
  try {
    // 優先檢查 Vite 的 import.meta.env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // 忽略存取錯誤
  }

  try {
    // 後備檢查 Node.js 的 process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // 忽略存取錯誤
  }
  
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// 檢查是否已設定 Supabase 環境變數
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL';

if (!isSupabaseConfigured) {
  console.error('[SupabaseClient] Critical Error: Credentials not found or invalid.');
  console.error('Please create a .env file in the project root with:');
  console.error('VITE_SUPABASE_URL=your_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_anon_key');
}

// --- Singleton Pattern Implementation ---
// 這是為了符合 Supabase 在 Vercel/Serverless 環境下的最佳實踐。
// 避免因為 React HMR (熱重載) 或元件重新渲染而建立多個客戶端實例。

let supabaseInstance: SupabaseClient | null = null;

const getSupabaseClient = () => {
    if (supabaseInstance) return supabaseInstance;

    if (isSupabaseConfigured) {
        supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
            auth: {
                persistSession: true, // 確保 session 在瀏覽器重整後保留
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            // 這裡可以加入 global fetch 設定來優化連線，例如設定 timeout
            global: {
                headers: { 'x-application-name': 'ai-property-appraiser' },
            }
        });
    } else {
        // 建立一個佔位符，防止未設定時報錯
        // 注意：這只是一個防止 crash 的空殼，任何呼叫都會失敗。
        supabaseInstance = createClient('https://placeholder.supabase.co', 'placeholder');
    }
    return supabaseInstance;
};

export const supabase = getSupabaseClient();
