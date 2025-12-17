
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { SparklesIcon } from './icons/SparklesIcon';
// Inline Icons to avoid extra files
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

interface ResetPasswordModalProps {
    onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onSuccess }) => {
    const { updateUser, currentUser } = useContext(AuthContext);
    const { t } = useContext(SettingsContext);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Reuse styling from LoginModal
    const inputClass = "w-full border border-slate-300 dark:border-slate-600 p-3 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-slate-200 disabled:cursor-not-allowed";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setError(t('error_fillEmailPassword'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('error_passwordMismatch'));
            return;
        }
        if (newPassword.length < 6) {
            setError(t('error_passwordTooShort'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (currentUser?.email) {
                const result = await updateUser(currentUser.email, { password: newPassword });
                if (result.success) {
                    setSuccess(true);
                    // Auto-redirect after short delay
                    setTimeout(() => {
                        onSuccess();
                    }, 2000);
                } else {
                    setError(t(result.messageKey) + (result.message ? `: ${result.message}` : ''));
                }
            } else {
                setError(t('error_noSession'));
            }
        } catch (err: any) {
            console.error(err);
            setError(t('unknownError') || '發生未知錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-blue-400 dark:border-blue-500 animate-fade-in-up">
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-blue-600" />
                        {t('resetPasswordTitle')}
                    </h2>
                    {/* No Close Button - User MUST reset or leave page */}
                </header>

                <div className="p-6 space-y-4">
                    {success ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('resetSuccessTitle')}</p>
                            <p className="text-gray-600 dark:text-gray-300">{t('resetSuccessMessage')}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
                                <p>為了您的帳號安全，請設定一組新的密碼。</p>
                                <p className="mt-2 text-xs opacity-80 font-bold">⚠️ 注意：為了確保安全，此重設連結僅限使用一次，請務必在開啟後立即完成設定。</p>
                            </div>

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder={t('newPasswordPlaceholder')}
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    className={inputClass}
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1" tabIndex={-1}>
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>

                            {error && (
                                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 break-words">
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={isLoading} className={`w-full font-bold p-3 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                {isLoading && <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>}
                                {t('confirmReset')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
