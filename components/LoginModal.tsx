
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SettingsContext } from '../contexts/SettingsContext';
import { sendEmail } from '../services/emailService';
import { isSupabaseConfigured } from '../supabaseClient';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const { resetPassword } = useContext(AuthContext);

  const handleForgotPasswordSubmit = async () => {
    if (!email) { setError(t('error_fillEmailPassword')); return; } /* reusing same key for simple 'Email is required' logic */
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await resetPassword(email);
      if (result.success) {
        setSuccessMsg(t(result.messageKey));
      } else {
        setError(t(result.messageKey) || 'Failed to send reset email.');
      }
    } catch (e) {
      setError(t('error_fillEmailPassword')); // Fallback or new key
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRegister) {
      setGeneratedCaptcha(Math.floor(100000 + Math.random() * 900000).toString());
      setPhone(settings.language === 'zh-TW' ? '886-' : '');
    } else {
      setRegistrationSuccess(false);
    }
  }, [isRegister, settings.language]);

  const notifyRegistration = async (newUserEmail: string, newUserName: string, newUserPhone: string) => {
    // 使用後端 API 發送 (確保能讀取到 SMTP 設定，避開 RLS 問題)
    try {
      if (window.electronAPI) {
        // Electron 這裡暫時沒改，假設它走舊路徑，或是您也可以加 IPC。
        // 為求簡單，若 Electron 沒實作 welcome，這裡可能會失敗。但在 Web 模式下：
        await fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newUserEmail, name: newUserName, phone: newUserPhone })
        });
      } else {
        await fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newUserEmail, name: newUserName, phone: newUserPhone })
        });
      }
      console.log('[LoginModal] 歡迎信發送請求已送出');
    } catch (e) {
      console.error('[LoginModal] 發送歡迎信失敗:', e);
    }
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (!isSupabaseConfigured) {
      setError(t('error_noSupabase') || '未設定 Supabase 連線 (.env)');
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
          setError(t(result.messageKey) + (result.message ? `: ${result.message}` : ''));
          setGeneratedCaptcha(Math.floor(100000 + Math.random() * 900000).toString());
        } else {
          setRegistrationSuccess(true);
          notifyRegistration(email, name, phone);
        }
      } else {
        const loginResult = await login(email, password);
        if (!loginResult.success) {
          // Check for known error message "Invalid login credentials"
          if (loginResult.message && loginResult.message.includes("Invalid login credentials")) {
            setError(t('loginFailed'));
          } else {
            setError(loginResult.message || t('loginFailed'));
          }
        }
      }
    } catch (e) {
      console.error("Form error:", e);
      setError(t('unknownError') || '發生未預期的錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFormType = () => { setIsRegister(!isRegister); setError(''); setRegistrationSuccess(false); };
  const inputClass = "w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLoginModalOpen(false)}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-orange-400 dark:border-orange-500" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><SparklesIcon className="h-6 w-6 text-blue-600" />{isRegister ? t('registerTitle') : t('loginTitle')}</h2>
          <button onClick={() => setLoginModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"><XMarkIcon className="h-6 w-6" /></button>
        </header>

        <div className="p-6 space-y-4">
          {registrationSuccess ? (
            <div className="text-center space-y-6">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('registrationSuccess')}</p>
              <p className="text-gray-600 dark:text-gray-300">{t('registrationSuccessPrompt')}</p>
              <button onClick={() => { setIsRegister(false); setRegistrationSuccess(false); }} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">{t('clickToLogin')}</button>
            </div>
          ) : (
            isForgotPassword ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t('resetPasswordTitle')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('resetPasswordInstruction')}</p>
                </div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('email')} className={inputClass} required disabled={!isSupabaseConfigured} />

                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                    {successMsg}
                  </div>
                )}

                <button type="button" onClick={handleForgotPasswordSubmit} disabled={isLoading || !isSupabaseConfigured} className={`w-full font-bold p-3 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 ${isLoading || !isSupabaseConfigured ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {isLoading && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>}
                  {t('sendResetEmail')}
                </button>
                <div className="text-center mt-4">
                  <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:underline">
                    {t('backToLogin')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleMainSubmit} className="space-y-4">
                {isRegister && (
                  <>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('name')} className={inputClass} required disabled={!isSupabaseConfigured} />
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phone')} className={inputClass} required disabled={!isSupabaseConfigured} />
                  </>
                )}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('email')} className={inputClass} required disabled={!isSupabaseConfigured} />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password')} className={inputClass} required disabled={!isSupabaseConfigured} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1" tabIndex={-1} disabled={!isSupabaseConfigured}>
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>

                {isRegister && (
                  <div className="flex gap-2">
                    <input type="text" value={captcha} onChange={e => setCaptcha(e.target.value)} placeholder={t('captcha')} className={inputClass} disabled={!isSupabaseConfigured} />
                    <div className="bg-gray-200 dark:bg-slate-600 dark:text-white p-3 rounded-lg flex items-center justify-center font-mono font-bold tracking-widest select-none w-1/3">{generatedCaptcha}</div>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 break-words">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={isLoading || !isSupabaseConfigured} className={`w-full font-bold p-3 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 ${isLoading || !isSupabaseConfigured ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {isLoading && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>}
                  {isRegister ? t('register') : t('login')}
                </button>
                <div className="flex justify-between items-center text-sm">
                  <p className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline" onClick={toggleFormType}>
                    {isRegister ? t('clickToLogin') : t('clickToRegister')}
                  </p>
                  {!isRegister && (
                    <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {t('forgotPasswordLink')}
                    </button>
                  )}
                </div>
              </form>
            )
          )}
        </div >
      </div >
    </div >
  );
};
