
import React, { useState, useContext, useEffect, ReactNode, ErrorInfo, Component } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { SettingsContext, Settings } from '../contexts/SettingsContext';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

// --- Error Boundary for PayPal ---
interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PayPalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PayPal SDK Crash caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error!);
    }
    return this.props.children || null;
  }
}

// --- Sub-component for PayPal Logic ---
const PayPalPaymentSection: React.FC<{ 
    amount: string, 
    description: string, 
    clientId: string,
    onApprove: (data: any, actions: any) => Promise<void>,
    onError: (err: any) => void 
}> = ({ amount, description, clientId, onApprove, onError }) => {
    const [{ isPending, isRejected }, dispatch] = usePayPalScriptReducer();

    const handleRetry = () => {
        dispatch({
            type: "resetOptions",
            value: {
                clientId: clientId,
                currency: "TWD",
                intent: "capture",
                components: "buttons",
                "data-sdk-integration-source": "react-paypal-js"
            }
        } as any);
    };

    if (isRejected) {
        return (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm mb-4 border border-red-200 flex flex-col items-start gap-2">
                <strong>Failed to load PayPal SDK.</strong>
                <p>This usually happens if the <b>Client ID</b> is invalid or the environment is restricted.</p>
                {clientId.startsWith('E') && (
                    <p className="text-red-700 font-bold">
                        Warning: Your ID starts with 'E'. You might have used the Secret Key instead of the Client ID.
                    </p>
                )}
                <p className="font-mono text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    Current ID: {clientId.substring(0, 8)}...
                </p>
                
                <div className="flex gap-2 mt-2">
                    <button 
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
                    >
                        <ArrowPathIcon className="h-4 w-4" />
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    if (isPending) {
         return (
            <div className="flex justify-center p-4">
                <svg className="animate-spin h-6 w-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
         );
    }

    return (
        <PayPalButtons 
            style={{ layout: "vertical" }}
            createOrder={(data, actions) => {
                return actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            amount: {
                                currency_code: "TWD",
                                value: amount
                            },
                            description: description
                        },
                    ],
                });
            }}
            onApprove={onApprove}
            onError={onError}
        />
    );
};

export const SettingsModal: React.FC = () => {
  const { settings, saveSettings, isSettingsModalOpen, setSettingsModalOpen, t } = useContext(SettingsContext);
  const { currentUser, updateUser } = useContext(AuthContext);
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState('');
  
  // Subscription State
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [paypalError, setPaypalError] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
    setUpgradeSuccess(''); // Reset on modal open
    setIsPaymentStep(false);
    setSelectedPlan('monthly');
    setPaypalError('');
  }, [settings, isSettingsModalOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => {
        setIsSaved(false);
        setSettingsModalOpen(false);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setLocalSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        setLocalSettings(prev => ({ ...prev, [name]: value as any }));
    }
  };

  const plans = [
      { id: 'monthly', label: t('planMonthly'), priceDisplay: 'NT$120', value: '120' },
      { id: 'biannual', label: t('planBiannual'), priceDisplay: 'NT$560', value: '560' },
      { id: 'yearly', label: t('planYearly'), priceDisplay: 'NT$960', value: '960' },
  ];

  const currentPlan = plans.find(p => p.id === selectedPlan);

  const handlePayPalApprove = async (data: any, actions: any) => {
      try {
          await actions.order.capture();
          
          // Real Upgrade Logic
          if (currentUser) {
            let daysToAdd = 30;
            if (selectedPlan === 'biannual') daysToAdd = 120;
            if (selectedPlan === 'yearly') daysToAdd = 365;

            const now = new Date();
            let newExpiryDate = now;
            
            if (currentUser.subscriptionExpiry) {
                const currentExpiry = new Date(currentUser.subscriptionExpiry);
                if (currentExpiry > now) {
                    newExpiryDate = currentExpiry;
                }
            }
            
            newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);

            const result = await updateUser(currentUser.email, { 
                role: '付費用戶',
                subscriptionExpiry: newExpiryDate.toISOString()
            });

            if (result.success) {
                setUpgradeSuccess(t('upgradeSuccess'));
                setPaypalError('');
            } else {
                setPaypalError("Upgrade failed locally: " + t(result.messageKey));
            }
          }

      } catch (err: any) {
          console.error("PayPal Capture Error:", err);
          setPaypalError(t('paymentFailed'));
      }
  };

  if (!isSettingsModalOpen) return null;

  return (
     <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setSettingsModalOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden border border-orange-400 dark:border-orange-500 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 id="settings-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                {t('settings')}
            </h2>
            <button onClick={() => setSettingsModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                <XMarkIcon className="h-6 w-6 dark:text-gray-300" />
            </button>
        </header>
        
        <main className="flex-grow p-6 overflow-y-auto">
          <form id="settings-form" onSubmit={handleSave} className="space-y-6">
            {/* Account Upgrade Section for General Users */}
            {(currentUser?.role as string) === '一般用戶' && (
              <fieldset className="space-y-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                    <SparklesIcon className="h-24 w-24 text-amber-600" />
                 </div>
                <legend className="relative z-10 text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-5 w-5" />
                  {t('upgradeAccount')}
                </legend>
                <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mb-4 leading-relaxed max-w-[90%]">
                    {t('upgradeDescription')}
                </p>
                
                {upgradeSuccess ? (
                  <div className="p-6 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-xl text-center animate-fade-in">
                    <div className="flex justify-center mb-3">
                        <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-bold text-lg">{upgradeSuccess}</p>
                  </div>
                ) : isPaymentStep ? (
                  <div className="animate-fade-in">
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm mb-1">{t('selectedPlan')}: {currentPlan?.label}</h4>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{currentPlan?.priceDisplay}</p>
                    </div>
                    
                    {paypalError && (
                        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm border border-red-200">
                            {paypalError}
                        </div>
                    )}

                    {settings.paypalClientId ? (
                        <PayPalErrorBoundary fallback={(err) => <div className="p-4 bg-red-50 text-red-600 text-sm rounded">PayPal Error: {err.message}</div>}>
                            <PayPalScriptProvider options={{ 
                                clientId: settings.paypalClientId,
                                currency: "TWD",
                                intent: "capture",
                            }}>
                                <PayPalPaymentSection 
                                    clientId={settings.paypalClientId}
                                    amount={currentPlan?.value || '120'}
                                    description={`Subscription - ${currentPlan?.label}`}
                                    onApprove={handlePayPalApprove}
                                    onError={(err: any) => setPaypalError("PayPal Error: " + JSON.stringify(err))}
                                />
                            </PayPalScriptProvider>
                        </PayPalErrorBoundary>
                    ) : (
                        <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">PayPal Client ID 未設定</p>
                            {currentUser?.role === '管理員' && (
                                <p className="text-xs text-gray-400 mt-1">請至管理後台設定</p>
                            )}
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={() => setIsPaymentStep(false)}
                        className="mt-3 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                    >
                        {t('backToPlans')}
                    </button>
                  </div>
                ) : (
                  <div className="animate-fade-in space-y-4">
                    {/* Restored Card Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {plans.map(plan => (
                            <div 
                                key={plan.id} 
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`relative cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 bg-white dark:bg-slate-800 ${selectedPlan === plan.id ? 'border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 shadow-lg transform -translate-y-1' : 'border-amber-200/50 hover:border-amber-300 dark:border-amber-800'}`}
                            >
                                {selectedPlan === plan.id && (
                                    <div className="absolute -top-3 -right-3 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                        <CheckCircleIcon className="h-5 w-5" />
                                    </div>
                                )}
                                <span className={`text-sm font-bold ${selectedPlan === plan.id ? 'text-amber-800 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>{plan.label}</span>
                                <span className={`text-xl font-extrabold ${selectedPlan === plan.id ? 'text-amber-600 dark:text-amber-300' : 'text-gray-800 dark:text-white'}`}>{plan.priceDisplay}</span>
                            </div>
                        ))}
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => setIsPaymentStep(true)}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 mt-2"
                    >
                        {t('upgradeWithPaypal')}
                    </button>
                  </div>
                )}
              </fieldset>
            )}

            {/* General Settings */}
            <div className="space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 mt-2">
                    {t('preferences')}
                </h3>
                
                {/* Language */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('language')}</label>
                    <select
                        name="language"
                        value={localSettings.language}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="zh-TW">繁體中文 (Traditional Chinese)</option>
                        <option value="zh-CN">简体中文 (Simplified Chinese)</option>
                        <option value="en">English</option>
                        <option value="ja">日本語 (Japanese)</option>
                    </select>
                </div>

                {/* API Key (Only if allowed or admin) */}
                {(currentUser?.role === '管理員' || currentUser?.role === '付費用戶' || settings.allowPublicApiKey) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Gemini API Key 
                            {currentUser?.role !== '管理員' && <span className="text-xs text-gray-500 ml-2">({t('optional')})</span>}
                        </label>
                        <input
                            type="password"
                            name="apiKey"
                            value={localSettings.apiKey}
                            onChange={handleChange}
                            placeholder={t('enterApiKey')}
                            className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('apiKeyDescription')} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                        </p>
                    </div>
                )}

                {/* Theme */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('theme')}</label>
                    <select
                        name="theme"
                        value={localSettings.theme}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="system">{t('themeSystem')}</option>
                        <option value="light">{t('themeLight')}</option>
                        <option value="dark">{t('themeDark')}</option>
                    </select>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
                <button
                    type="button"
                    onClick={() => setSettingsModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700"
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={isSaved}
                    className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all flex items-center gap-2 ${isSaved ? 'bg-green-600' : 'bg-blue-700 hover:bg-blue-800'}`}
                >
                    {isSaved ? (
                        <>
                            <CheckCircleIcon className="h-5 w-5" />
                            {t('saved')}
                        </>
                    ) : t('save')}
                </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};
