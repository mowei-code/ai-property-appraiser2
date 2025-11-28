
import { createClient } from '@supabase/supabase-js';

// 這些環境變數需要在您的專案根目錄下的 .env 檔案中設定 (本地開發)
// 或是在 Vercel 的 Environment Variables 中設定 (線上部署)
// 格式範例:
// VITE_SUPABASE_URL=https://your-project-id.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key

// 使用 Optional Chaining (?.) 避免在某些環境下 import.meta.env 未定義導致崩潰
const env = (import.meta as any).env || {};
// 使用 trim() 去除可能不小心複製到的空白字元
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

// 匯出設定狀態供其他元件檢查
// 只有當 URL 和 Key 都有值的時候，才視為已設定
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';

// Debug log for production diagnostics (這會顯示在瀏覽器的 Console 中，幫助您除錯)
if (!isSupabaseConfigured) {
  console.warn('⚠️ [Supabase] Missing Configuration. Running in Local Storage Fallback Mode.');
  console.warn('Checks: URL present?', !!supabaseUrl, 'Key present?', !!supabaseAnonKey);
} else {
  console.log('✅ [Supabase] Configuration loaded. Connecting to:', supabaseUrl.substring(0, 15) + '...');
}

// 若 URL 為空，使用 placeholder 防止 build time crash，但在使用時會報錯
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);
