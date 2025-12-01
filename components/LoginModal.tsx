
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SettingsContext } from '../contexts/SettingsContext';
import { sendEmail } from '../services/emailService';
import { isSupabaseConfigured } from '../supabaseClient'; 
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

// 內建 EyeIcon 與 EyeSlashIcon 以避免新增檔案依賴
const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const EyeSlashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export const LoginModal: React.FC = () => {
  const { login, register, setLoginModalOpen } = useContext(AuthContext);
  const { t, settings } = useContext(SettingsContext);
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDbHelp, setShowDbHelp] = useState(false);
  
  // 如果未設定連線，直接預設顯示設定畫面
  const [showSupabaseSetup, setShowSupabaseSetup] = useState(!isSupabaseConfigured);
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');

  useEffect(() => {
    // 從 LocalStorage 預填，方便修改
    const savedUrl = localStorage.getItem('app_supabase_url');
    const savedKey = localStorage.getItem('app_supabase_anon_key');
    if (savedUrl) setSbUrl(savedUrl);
    if (savedKey) setSbKey(savedKey);
  }, []);

  useEffect(() => {
    if (isRegister) {
        setGeneratedCaptcha(Math.floor(100000 + Math.random() * 900000).toString());
        setPhone(settings.language === 'zh-TW' ? '886-' : '');
    } else {
        setRegistrationSuccess(false);
        setEmailStatus('');
    }
  }, [isRegister, settings.language]);

  const notifyRegistration = async (newUserEmail: string, newUserName: string, newUserPhone: string) => {
    if (!settings.smtpHost || !settings.smtpUser) {
        setEmailStatus('未設定 SMTP，無法發送通知信。');
        return;
    }

    const result = await sendEmail({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPass: settings.smtpPass,
        to: newUserEmail,
        cc: settings.systemEmail,
        subject: `[AI房產估價師] 歡迎加入！註冊成功通知`,
        text: `親愛的 ${newUserName} 您好，\n\n歡迎加入 AI 房產估價師！\n您的帳號已建立成功。\n\n註冊資訊：\nEmail: ${newUserEmail}\n電話: ${newUserPhone}\n\n(此信件由系統自動發送)`
    });

    if (result.success) {
        setEmailStatus('歡迎信與系統通知已發送成功。');
    } else {
        setEmailStatus(`通知信發送失敗: ${result.error}`);
    }
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; 
    
    setError('');
    // 這裡我們不重置 showDbHelp，也不自動開啟它
    
    if (!isSupabaseConfigured) {
        setShowSupabaseSetup(true);
        setError('請先完成資料庫連線設定。');
        return;
    }

    if (!email || !password) { setError(t('error_fillEmailPassword')); return; }
    
    setIsLoading(true);

    try {
        if (isRegister) {
           if (!name.trim() || !phone.trim()) { 
               setError(t('error_fillNamePhone')); 
               setIsLoading(false);
               return; 
           }
           if (captcha !== generatedCaptcha) { 
               setError(t('captchaError')); 
               setGeneratedCaptcha(Math.floor(100000 + Math.random() * 900000).toString());
               setIsLoading(false);
               return; 
           }

           const result = await register({ email, password, name, phone });
           if (!result.success) {
             setError(t(result.messageKey));
             if (result.errorDetail) {
                 setError(prev => `${prev} (${result.errorDetail})`);
                 // 這裡絕對不自動彈出 SQL 視窗
             }
             setGeneratedCaptcha(Math.floor(100000 + Math.random() * 900000).toString());
           } else {
               setRegistrationSuccess(true);
               setEmailStatus('正在發送通知信...');
               await notifyRegistration(email, name, phone);
           }
        } else {
          console.log("Submitting login form...");
          const loginResult = await login(email, password);
          if (!loginResult.success) {
              setError(loginResult.message || t('loginFailed'));
              // 這裡絕對不自動彈出 SQL 視窗
          }
        }
    } catch (e) {
        console.error("Form error:", e);
        setError('發生未預期的錯誤');
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSaveSupabaseConfig = () => {
      if(!sbUrl || !sbKey) {
          setError('請填寫 URL 與 Key');
          return;
      }
      try {
          // 簡單驗證 URL 格式
          new URL(sbUrl);
          
          localStorage.setItem('app_supabase_url', sbUrl.trim());
          localStorage.setItem('app_supabase_anon_key', sbKey.trim());
          alert('設定已儲存，頁面將重新整理以套用。');
          window.location.reload();
      } catch (e) {
          setError('無效的 URL 格式，請確認開頭包含 https://');
      }
  };
  
  const toggleFormType = () => { setIsRegister(!isRegister); setError(''); setRegistrationSuccess(false); setShowDbHelp(false); };
  const switchToLoginAfterSuccess = () => { setIsRegister(false); setError(''); setRegistrationSuccess(false); };

  const inputClass = "w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLoginModalOpen(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-orange-400 dark:border-orange-500" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-blue-600"/>{isRegister ? t('registerTitle') : t('loginTitle')}</h2>
          <button onClick={() => setLoginModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><XMarkIcon className="h-6 w-6" /></button>
        </header>

        <div className="p-6 space-y-4">
          
          {/* 強制顯示設定介面，如果未連線 */}
          {showSupabaseSetup ? (
              <div className="space-y-4 animate-fade-in">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-2 flex items-center gap-2">
                          <CheckCircleIcon className="h-4 w-4" />
                          初始化系統連線 (Supabase)
                      </h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
                          首次使用或 .env 未設定時，請在此輸入您的連線資訊。
                      </p>
                      
                      <div className="space-y-3">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Project URL (例如: https://xyz.supabase.co)</label>
                              <input 
                                  type="text" 
                                  value={sbUrl} 
                                  onChange={e=>setSbUrl(e.target.value)} 
                                  placeholder="https://your-project.supabase.co" 
                                  className={inputClass + " text-sm"}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Anon Key (public)</label>
                              <input 
                                  type="password" 
                                  value={sbKey} 
                                  onChange={e=>setSbKey(e.target.value)} 
                                  placeholder="eyJh..." 
                                  className={inputClass + " text-sm"}
                              />
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-2">
                      {/* 如果已經有連線，才允許取消設定畫面 */}
                      {isSupabaseConfigured && (
                          <button 
                              onClick={() => setShowSupabaseSetup(false)} 
                              className="w-1/3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                              返回
                          </button>
                      )}
                      <button 
                          onClick={handleSaveSupabaseConfig} 
                          className={`py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-md ${isSupabaseConfigured ? 'w-2/3' : 'w-full'}`}
                      >
                          儲存設定並重整頁面
                      </button>
                  </div>
              </div>
          ) : registrationSuccess ? (
              <div className="text-center space-y-6">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('registrationSuccess')}</p>
                  <p className="text-gray-600 dark:text-gray-300">{t('registrationSuccessPrompt')}</p>
                  {emailStatus && (
                      <p className={`text-xs ${emailStatus.includes('失敗') ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {emailStatus}
                      </p>
                  )}
                  <button onClick={switchToLoginAfterSuccess} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{t('clickToLogin')}</button>
              </div>
          ) : (
            <form onSubmit={handleMainSubmit} className="space-y-4">
                {isRegister && (
                    <>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e=>setName(e.target.value)} 
                            placeholder={t('name')} 
                            className={inputClass} 
                            required 
                            disabled={!isSupabaseConfigured}
                        />
                        <input 
                            type="text" 
                            value={phone} 
                            onChange={e=>setPhone(e.target.value)} 
                            placeholder={t('phone')} 
                            className={inputClass} 
                            required 
                            disabled={!isSupabaseConfigured}
                        />
                    </>
                )}
                <input 
                    type="email" 
                    value={email} 
                    onChange={e=>setEmail(e.target.value)} 
                    placeholder={t('email')} 
                    className={inputClass} 
                    required 
                    disabled={!isSupabaseConfigured}
                />
                
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={password} 
                        onChange={e=>setPassword(e.target.value)} 
                        placeholder={t('password')} 
                        className={inputClass} 
                        required 
                        disabled={!isSupabaseConfigured}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        tabIndex={-1}
                        disabled={!isSupabaseConfigured}
                    >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>

                {isRegister && (
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={captcha} 
                            onChange={e=>setCaptcha(e.target.value)} 
                            placeholder={t('captcha')} 
                            className={inputClass} 
                            disabled={!isSupabaseConfigured}
                        />
                        <div className="bg-gray-200 dark:bg-slate-600 dark:text-white p-3 rounded-lg flex items-center justify-center font-mono font-bold tracking-widest select-none w-1/3">
                            {generatedCaptcha}
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 break-words flex flex-col gap-2">
                        <span>{error}</span>
                        {/* 手動開啟修復視窗的按鈕，完全手動 */}
                        <button 
                            type="button" 
                            onClick={() => setShowDbHelp(true)} 
                            className="mt-1 flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 py-1.5 px-2 rounded text-xs font-bold transition-colors w-full"
                        >
                            <ExclamationTriangleIcon className="h-3 w-3" />
                            點此查看 SQL 修復指令 (V4安全版)
                        </button>
                    </div>
                )}
                
                <button 
                    type="submit" 
                    disabled={isLoading || !isSupabaseConfigured}
                    className={`w-full font-bold p-3 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 ${isLoading || !isSupabaseConfigured ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                    {isLoading && (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    )}
                    {isRegister ? t('register') : t('login')}
                </button>
                <div className="flex justify-between items-center text-sm">
                    <p className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline" onClick={toggleFormType}>
                        {isRegister ? t('clickToLogin') : t('clickToRegister')}
                    </p>
                    {isSupabaseConfigured && (
                        <button 
                            type="button"
                            onClick={() => setShowSupabaseSetup(true)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                        >
                            重設連線
                        </button>
                    )}
                </div>
            </form>
          )}
        </div>
        
        {/* Connection Status Footer */}
        <div className={`px-4 py-2 text-[10px] text-center border-t ${isSupabaseConfigured ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
            系統狀態: {isSupabaseConfigured ? '雲端資料庫已連線' : '等待連線設定...'}
        </div>
      </div>

      {/* Database Helper Modal Overlay */}
      {showDbHelp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-2xl border-2 border-indigo-500">
                  <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
                      <DocumentTextIcon className="h-6 w-6" />
                      資料庫修復指令 (SQL Setup) - V4 安全版
                  </h3>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 space-y-2">
                      <p>請複製下方代碼，貼到 Supabase 的 <strong>SQL Editor</strong> 執行。</p>
                      <p className="text-green-600 dark:text-green-400 font-bold">此版本採用「安全模式 (Safe Mode)」，即使權限不足導致寫入失敗，也會強制允許帳號註冊成功，讓您能順利登入。</p>
                  </div>
                  <div className="bg-gray-900 text-gray-200 p-4 rounded-lg font-mono text-xs overflow-auto h-64 mb-4 select-all">
{`-- 1. Reset Triggers & Functions (清理舊設定)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Ensure Table Exists & Has Correct Columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email text,
  name text,
  role text DEFAULT '一般用戶',
  phone text,
  subscription_expiry timestamptz,
  updated_at timestamptz
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT '一般用戶';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 3. Grants (修復權限問題)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;

-- 4. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Trigger Function (安全模式：忽略寫入錯誤)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, name, role, updated_at)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'name', '一般用戶', now())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- 關鍵修正：捕捉並忽略所有寫入錯誤，避免阻擋帳號註冊
    RAISE WARNING 'Profile creation failed: %', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`}
                  </div>
                  <div className="flex justify-end">
                      <button onClick={() => setShowDbHelp(false)} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">關閉</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
