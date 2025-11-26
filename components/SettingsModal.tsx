
import React, { useState, useContext, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { SettingsContext, Settings } from '../contexts/SettingsContext';
import { AuthContext } from '../contexts/AuthContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { LinkIcon } from './icons/LinkIcon';

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
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

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
    return this.props.children;
  }
}

// --- Sub-component for PayPal Logic ---
const PayPalPaymentSection: React.FC<{ 
    amount: string, 
    description: string, 
    clientId: string,
    onApprove: (data: any, actions: any) => void,
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
        });
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
  
  // Environment Check
  // Strictly check protocol. If it's not http: or https:, block it.
  const isInvalidEnv = !window.location.protocol.startsWith('http');

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
        setLocalSettings(prev => ({ ...prev, [name]: value }));
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

            const result = updateUser(currentUser.email, { 
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

  // Helper to create a data URI for testing PayPal ID in a new tab without server
  const getTestLink = (clientId: string) => {
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayPal Connection Test</title>
    <script src="https://www.paypal.com/sdk/js?client-id=${clientId}&currency=TWD&components=buttons&debug=true"></script>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f3f4f6; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; border: 1px solid #e5e7eb; }
        .client-id { background: #f9fafb; padding: 0.5rem; border-radius: 6px; font-family: monospace; color: #6b7280; word-break: break-all; margin-bottom: 1.5rem; font-size: 0.8rem; border: 1px solid #d1d5db; }
        #paypal-button-container { margin-top: 1.5rem; min-height: 50px; }
        .status { margin-bottom: 1rem; padding: 1rem; border-radius: 6px; font-weight: 600; font-size: 0.95rem; }
        .status.loading { background-color: #e0f2fe; color: #0369a1; }
        .status.success { background-color: #dcfce7; color: #15803d; }
        .status.warning { background-color: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
        .status.error { background-color: #fee2e2; color: #b91c1c; }
    </style>
</head>
<body>
    <div class="card">
        <h2>PayPal 連線測試</h2>
        <div class="client-id">ID: ${clientId}</div>
        <div id="status" class="status loading">正在連線 PayPal SDK...</div>
        <div id="paypal-button-container"></div>
    </div>
    <script>
        const statusEl = document.getElementById('status');
        window.onload = function() {
            if (window.paypal) {
                statusEl.textContent = "✅ SDK 載入成功！Client ID 有效。";
                statusEl.className = "status success";
                
                // Attempt to render button (might fail in sandbox data-uri)
                try {
                    paypal.Buttons({
                        style: { layout: 'vertical' },
                        createOrder: function(data, actions) { return actions.order.create({ purchase_units: [{ amount: { value: '1.00' } }] }); }
                    }).render('#paypal-button-container').catch(e => {
                        console.warn("Render blocked (expected in sandbox):", e);
                        statusEl.innerHTML = "✅ <b>連線成功！ID 正確。</b><br><span style='font-size:0.8em; font-weight:normal'>(按鈕渲染受瀏覽器安全限制阻擋，但 ID 驗證已通過)</span>";
                        statusEl.className = "status success"; 
                    });
                } catch(e) {
                    // Ignore render errors if SDK loaded fine
                }
            } else {
                statusEl.innerHTML = "❌ SDK 載入失敗。<br><span style='font-size:0.8em; font-weight:normal'>請檢查網路或確認 ID 是否正確。</span>";
                statusEl.className = "status error";
            }
        };
    </script>
</body>
</html>`;
      return `data:text/html;base64,${btoa(unescape(encodeURIComponent(htmlContent)))}`;
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
            {currentUser?.role === '一般用戶' && (
              <fieldset className="space-y-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-700/50 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2 opacity-10">
                    <SparklesIcon className="h-24 w-24 text-amber-600" />
                 </div>
                <legend className="relative z-10 text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" />
                  {t('upgradeAccount')}
                </legend>
                
                {upgradeSuccess ? (
                  <div className="p-6 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-xl text-center animate-fade-in">
                    <div className="flex justify-center mb-3">
                        <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-bold text-lg">{upgradeSuccess}</p>
                  </div>
                ) : isPaymentStep ? (
                    // Payment Confirmation Step with PayPal
                    <div className="relative z-10 animate-fade-in">
                        <h4 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-4">{t('confirmPaymentTitle')}</h4>
                        
                        <div className="bg-white/60 dark:bg-slate-900/60 p-5 rounded-xl border border-amber-200 dark:border-amber-800/50 mb-4 backdrop-blur-sm">
                             <div className="flex justify-between items-center mb-2 border-b border-dashed border-gray-300 dark:border-gray-600 pb-2">
                                 <span className="text-gray-600 dark:text-gray-300 font-medium">{t('selectedPlan')}</span>
                                 <span className="font-bold text-gray-900 dark:text-white">{currentPlan?.label}</span>
                             </div>
                             <div className="flex justify-between items-center pt-1">
                                 <span className="text-gray-600 dark:text-gray-300 font-medium">{t('paymentAmount')}</span>
                                 <span className="font-black text-2xl text-blue-600 dark:text-blue-400">{currentPlan?.priceDisplay}</span>
                             </div>
                        </div>
                        
                        {paypalError && (
                             <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">
                                 {paypalError}
                             </div>
                        )}

                        {settings.paypalClientId ? (
                            // CRITICAL: Do NOT render PayPalScriptProvider if environment is invalid (file/blob protocol).
                            isInvalidEnv ? (
                                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm mb-4 border border-amber-200">
                                    <h4 className="font-bold flex items-center gap-2 mb-1">
                                        <ExclamationTriangleIcon className="h-5 w-5" />
                                        Unsupported Environment (不支援的環境)
                                    </h4>
                                    <p className="mb-2">PayPal 支付功能需要標準的 Web Server 環境 (http/https)。</p>
                                    <p className="text-xs opacity-80 break-all mb-3">
                                        目前執行於: <code className="font-mono bg-amber-100 px-1 rounded">{window.location.protocol}//{window.location.host || 'localhost'}</code>
                                    </p>
                                    <p className="text-xs text-amber-700 mb-2">
                                        您正處於預覽或本機檔案模式，PayPal 安全策略禁止在此環境下載入。
                                    </p>
                                    
                                    <div className="flex flex-col gap-2 mt-3">
                                        <a 
                                            href={getTestLink(settings.paypalClientId)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-2.5 px-3 bg-white text-blue-600 border border-blue-200 font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                            在新分頁驗證 Client ID (推薦)
                                        </a>
                                        <p className="text-[10px] text-center text-gray-500 mt-1">此按鈕會開啟一個獨立的測試頁面，確認您的 Client ID 是否正確。</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="my-4 min-h-[150px]">
                                    <PayPalErrorBoundary
                                        fallback={(err) => (
                                            <div className="p-4 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
                                                <p className="font-bold mb-2">PayPal SDK 載入或執行錯誤</p>
                                                <p className="text-xs mb-3 font-mono break-all">{err.message}</p>
                                                
                                                <div className="flex flex-col gap-2">
                                                    <a 
                                                        href={getTestLink(settings.paypalClientId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full py-2 px-3 bg-white text-red-600 border border-red-200 font-bold rounded-lg shadow-sm hover:bg-red-50 transition-colors text-xs flex items-center justify-center gap-2"
                                                    >
                                                        <LinkIcon className="h-4 w-4" />
                                                        在新分頁驗證 Client ID (視覺化測試)
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    >
                                        <PayPalScriptProvider 
                                            options={{ 
                                                clientId: settings.paypalClientId, 
                                                currency: "TWD",
                                                intent: "capture",
                                                components: "buttons",
                                                "data-sdk-integration-source": "react-paypal-js"
                                            }}
                                            key={settings.paypalClientId} 
                                        >
                                        <PayPalPaymentSection 
                                                amount={currentPlan?.value || "120"}
                                                description={`AI Property Appraiser - ${currentPlan?.label}`}
                                                clientId={settings.paypalClientId}
                                                onApprove={handlePayPalApprove}
                                                onError={(err: any) => {
                                                    console.error("PayPal Error:", err);
                                                    const errMsg = err?.message || String(err);
                                                    setPaypalError(t('paymentError') + ": " + errMsg);
                                                }}
                                        />
                                        </PayPalScriptProvider>
                                    </PayPalErrorBoundary>
                                </div>
                            )
                        ) : (
                            <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-sm mb-4">
                                {t('paypalNotConfigured')}
                            </div>
                        )}

                        <button 
                            type="button" 
                            onClick={() => setIsPaymentStep(false)} 
                            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t('back')}
                        </button>
                    </div>
                ) : (
                    // Plan Selection Step
                    <div className="relative z-10 space-y-4 animate-fade-in">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                            {t('upgradeDescription')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {plans.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`cursor-pointer relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center bg-white/80 dark:bg-slate-800/80 ${selectedPlan === plan.id ? 'border-amber-500 shadow-md scale-105 z-10 ring-2 ring-amber-200 dark:ring-amber-900' : 'border-transparent hover:border-amber-200 dark:hover:border-amber-800 hover:bg-white dark:hover:bg-slate-800 shadow-sm'}`}
                                >
                                    {selectedPlan === plan.id && (
                                        <div className="absolute -top-3 -right-3 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                                            <CheckCircleIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div className="font-bold text-gray-800 dark:text-gray-100 text-sm mb-1">{plan.label}</div>
                                    <div className="text-amber-600 dark:text-amber-400 font-black text-lg">{plan.priceDisplay}</div>
                                </div>
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setIsPaymentStep(true)}
                            className="w-full px-4 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2"
                        >
                            {t('upgradeWithPaypal')}
                        </button>
                    </div>
                )}
              </fieldset>
            )}
            
            {/* Current Subscription Display for Paid Users */}
            {currentUser?.role === '付費用戶' && currentUser?.subscriptionExpiry && (
                 <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-2">
                        <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        <span className="font-bold text-lg text-green-900 dark:text-green-100">{t('paidUser')}</span>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-300 ml-9">
                        {t('subscriptionExpiresOn')}: <span className="font-mono font-bold">{new Date(currentUser.subscriptionExpiry).toLocaleDateString()}</span>
                    </p>
                 </div>
            )}

            {/* API Key Settings */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('apiKeySettings')}</legend>
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                    {t('yourGeminiApiKey_linkText')}
                  </a>
                  <span className="text-gray-700 dark:text-gray-300 ml-1">({t('yourGeminiApiKey_promptText')})</span>
                </label>
                <input
                  type="password"
                  id="apiKey"
                  name="apiKey"
                  value={localSettings.apiKey}
                  onChange={handleChange}
                  placeholder={t('enterYourGeminiApiKey')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('apiKeyPrivacyNotice')}
                </p>
              </div>
               {currentUser?.role === '管理員' && (
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                      <div>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="allowPublicApiKey"
                                checked={localSettings.allowPublicApiKey}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{t('enableGlobalApiKey')}</span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {t('globalApiKeyNotice')}
                        </p>
                      </div>
                      {localSettings.allowPublicApiKey && (
                          <div className="mt-3">
                               <label htmlFor="publicApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  {t('globalGeminiApiKey')}
                              </label>
                              <input
                                  type="password"
                                  id="publicApiKey"
                                  name="publicApiKey"
                                  value={localSettings.publicApiKey}
                                  onChange={handleChange}
                                  placeholder={t('enterGlobalApiKey')}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                          </div>
                      )}
                  </div>
               )}
            </fieldset>

            {/* Appearance Settings */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-gray-900 dark:text-white">{t('appearanceAndDisplay')}</legend>
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('theme')}
                </label>
                <select
                  id="theme"
                  name="theme"
                  value={localSettings.theme}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="light">{t('theme_light')}</option>
                  <option value="dark">{t('theme_dark')}</option>
                  <option value="system">{t('theme_system')}</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="font" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('font')}
                </label>
                <select
                  id="font"
                  name="font"
                  value={localSettings.font}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="sans">{t('fontSans')}</option>
                  <option value="serif">{t('fontSerif')}</option>
                  <option value="mono">{t('font_mono')}</option>
                  <option value="kai">{t('font_kai')}</option>
                  <option value="cursive">{t('font_cursive')}</option>
                </select>
              </div>
               <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('language')}
                </label>
                <select
                  id="language"
                  name="language"
                  value={localSettings.language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="zh-TW">{t('lang_zh-TW')}</option>
                  <option value="zh-CN">{t('lang_zh-CN')}</option>
                  <option value="en">{t('lang_en')}</option>
                  <option value="ja">{t('lang_ja')}</option>
                </select>
              </div>
            </fieldset>
          </form>
        </main>
        
        <footer className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50">
            <button type="submit" form="settings-form" className={`px-6 py-3 font-semibold rounded-lg shadow-md transition-colors w-full sm:w-auto ${isSaved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
              {isSaved ? t('saved') : t('saveSettings')}
            </button>
        </footer>
      </div>
    </div>
  );
};
