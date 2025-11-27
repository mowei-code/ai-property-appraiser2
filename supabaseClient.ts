
import { createClient } from '@supabase/supabase-js';

// 這些環境變數需要在您的專案根目錄下的 .env 檔案中設定 (本地開發)
// 或是在 Vercel 的 Environment Variables 中設定 (線上部署)
// 格式範例:
// VITE_SUPABASE_URL=https://your-project-id.supabase.co
// VITE_SUPABASE_ANON_KEY=your-anon-key

// 使用 Optional Chaining (?.) 避免在某些環境下 import.meta.env 未定義導致崩潰
// 安全地取得環境變數物件，若 import.meta.env 為 undefined 則回退至空物件
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

// 匯出設定狀態供其他元件檢查
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.info('ℹ️ 未偵測到 Supabase 設定 (URL/Key)。應用程式將以「本地儲存模式」運行，資料將僅儲存於瀏覽器中。');
}

// 若 URL 為空，使用 placeholder 防止 build time crash
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);
