
import React, { useState, useEffect, useContext } from 'react';
import { MapPinIcon } from './icons/MapPinIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { formatNominatimAddress } from '../utils';
import type { User } from '../types';
import { SettingsContext } from '../contexts/SettingsContext';

interface SearchFormProps {
  onSearch: (
    address: string,
    reference: string,
    details?: { coords: { lat: number; lon: number }; district: string; city?: string },
    customInputs?: { size?: number; pricePerPing?: number; floor?: string; customRequest?: string }
  ) => void;
  onLocationSelect: (
    address: string,
    details: { coords: { lat: number; lon: number }; district: string; city?: string }
  ) => void;
  isLoading: boolean;
  initialAddress: string;
  currentUser: User | null;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onLocationSelect, isLoading, initialAddress, currentUser }) => {
  const { getApiKey, setSettingsModalOpen, t, settings } = useContext(SettingsContext);

  const valuationReferences = [
    { value: 'comprehensiveMarketFactors', label: t('comprehensiveMarketFactors') },
    { value: 'actualTransactions', label: t('actualTransactions') },
    { value: 'realtorPerspective', label: t('realtorPerspective') },
    { value: 'actualPingSize', label: t('actualPingSize') },
    { value: 'regionalDevelopmentPotential', label: t('regionalDevelopmentPotential') },
    { value: 'foreclosureInfo', label: t('foreclosureInfo') },
    { value: 'rentalYieldAnalysis', label: t('rentalYieldAnalysis') },
    { value: 'bankAppraisalModel', label: t('bankAppraisalModel') },
    { value: 'urbanRenewalPotential', label: t('urbanRenewalPotential') },
    { value: 'commercialValue', label: t('commercialValue') },
    { value: 'structureSafety', label: t('structureSafety') },
    { value: 'customValuation', label: t('customValuation') },
  ];

  const restrictedReferences = [
      'actualTransactions', 
      'realtorPerspective', 
      'actualPingSize',
      'regionalDevelopmentPotential',
      'foreclosureInfo',
      'rentalYieldAnalysis',
      'bankAppraisalModel',
      'urbanRenewalPotential',
      'commercialValue',
      'structureSafety',
      'customValuation',
  ];

  const [address, setAddress] = useState(initialAddress);
  const [reference, setReference] = useState(valuationReferences[0].value);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState('');
  const [customPricePerPing, setCustomPricePerPing] = useState('');
  const [customFloor, setCustomFloor] = useState('');
  const [customRequest, setCustomRequest] = useState('');
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);

  const userHasPermission = currentUser?.role === '管理員' || currentUser?.role === '付費用戶';
  const hasApiKey = !!getApiKey();

  useEffect(() => {
    setAddress(initialAddress);
  }, [initialAddress]);

  // Reset reference if the current one becomes disabled
  useEffect(() => {
    const isRestrictedAndNoPerms = restrictedReferences.includes(reference) && !userHasPermission;
    if (!hasApiKey || isRestrictedAndNoPerms) {
      setReference(valuationReferences[0].value);
    }
  }, [userHasPermission, reference, hasApiKey, t]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeolocationError(null);
    setShowApiKeyWarning(false);
    
    if (!getApiKey()) {
        setShowApiKeyWarning(true);
        return;
    }

    if (address.trim()) {
      let customInputs: { size?: number; pricePerPing?: number; floor?: string; customRequest?: string } = {};
      
      if (reference === 'actualPingSize') {
        const sizeNum = parseFloat(customSize);
        const priceNum = parseFloat(customPricePerPing);
        if (!isNaN(sizeNum) && sizeNum > 0) {
          customInputs.size = sizeNum * 3.30579; // Convert ping to sqm
        }
        if (!isNaN(priceNum) && priceNum > 0) {
          customInputs.pricePerPing = priceNum;
        }
        if (customFloor.trim() !== '') {
            customInputs.floor = customFloor.trim();
        }
      }

      if (reference === 'customValuation') {
         if (customRequest.trim() !== '') {
            customInputs.customRequest = customRequest.trim();
         } else {
            // If empty, fallback to generic comprehensive if they didn't type anything, or just send empty string and let prompt handle it (prompt might be generic).
            // Better to require it? For now let's just pass it.
         }
      }

      onSearch(address.trim(), reference, undefined, Object.keys(customInputs).length > 0 ? customInputs : undefined);
    }
  };
  
  const handleGeolocation = () => {
    setGeolocationError(null);
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=zh-TW`);
            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }
            const data = await response.json();
            
            let fetchedAddress = formatNominatimAddress(data);
            let fetchedDistrict = '未知區域';
            let fetchedCity = undefined;

            if (data.address) {
                const addr = data.address;
                fetchedDistrict = addr.suburb || addr.city_district || '未知區域';
                fetchedCity = addr.city || addr.county;
            }
            
            if (!fetchedAddress) {
                fetchedAddress = `緯度: ${latitude.toFixed(5)}, 經度: ${longitude.toFixed(5)}`;
            }

            setAddress(fetchedAddress);
            onLocationSelect(fetchedAddress, { 
                coords: { lat: latitude, lon: longitude },
                district: fetchedDistrict,
                city: fetchedCity
            });
          } catch (error) {
              console.error("Geolocation reverse geocoding error:", error);
              setGeolocationError(t('reverseGeocodingError'));
          }
        },
        (error: GeolocationPositionError) => {
          console.error(`Geolocation error: ${error.message} (code: ${error.code})`);
          let errorMessageKey: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessageKey = "geolocationErrorPermissionDenied";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessageKey = "geolocationErrorPositionUnavailable";
              break;
            case error.TIMEOUT:
              errorMessageKey = "geolocationErrorTimeout";
              break;
            default:
              errorMessageKey = "geolocationErrorUnknown";
              break;
          }
          setGeolocationError(t(errorMessageKey));
        },
        options
      );
    } else {
      setGeolocationError(t("geolocationErrorUnsupported"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="flex flex-col gap-6">
        {/* Hero Address Input */}
        <div className="relative group">
          <label htmlFor="address-search" className="sr-only">{t('addressSearchPlaceholder')}</label>
          <div className="relative flex items-center">
             <input
                id="address-search"
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setGeolocationError(null);
                }}
                placeholder={t('addressSearchPlaceholder')}
                className="w-full pl-6 pr-14 py-4 text-lg border-2 border-slate-200 dark:border-slate-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 shadow-sm group-hover:shadow-md"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleGeolocation}
                disabled={isLoading}
                className="absolute right-3 p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                title={t('useCurrentLocation')}
                aria-label={t('useCurrentLocation')}
              >
                <MapPinIcon className="h-6 w-6" />
              </button>
          </div>
        </div>

        {/* Valuation Reference Chips */}
        <fieldset>
           <div className="mb-3 px-1">
              <legend className="block text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
                {t('valuationBasis')}
              </legend>
              {settings.language === 'zh-TW' && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    設置完成自己的 Gemini API Key 後一般會員只能使用綠色的「綜合市場因素」，
                    <button 
                        type="button" 
                        onClick={() => setSettingsModalOpen(true)} 
                        className="text-blue-600 hover:underline font-medium"
                    >
                        升級為付費會員
                    </button>
                    始得開啟全部反灰鎖定功能。
                  </p>
              )}
           </div>
          <div className="flex flex-wrap gap-2">
            {valuationReferences.map((ref) => {
                const isRestricted = restrictedReferences.includes(ref.value);
                const isFreeTierOption = ref.value === 'comprehensiveMarketFactors';
                const isDisabledByPerms = isRestricted && !userHasPermission;
                const isDisabled = !hasApiKey || isDisabledByPerms;
                
                let tooltip = '';
                if (!hasApiKey) {
                    tooltip = t('valuationDisabledTooltip');
                } else if (isDisabledByPerms) {
                    tooltip = t('premiumFeatureTooltip');
                }

                const isSelected = reference === ref.value;

                return (
                  <div key={ref.value} title={tooltip} className="relative">
                    <input
                      type="radio"
                      id={`ref-${ref.value}`}
                      name="valuation-reference"
                      value={ref.value}
                      checked={isSelected}
                      onChange={(e) => setReference(e.target.value)}
                      className="sr-only"
                      disabled={isLoading || isDisabled}
                    />
                    <label
                      htmlFor={`ref-${ref.value}`}
                      className={`
                        block px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer select-none border
                        ${isSelected && hasApiKey
                            ? isFreeTierOption 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/30'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                        ${isSelected ? 'scale-105' : ''}
                      `}
                    >
                      {ref.label}
                    </label>
                  </div>
                )
            })}
          </div>
        </fieldset>

        {/* Custom Inputs for '真實坪數' */}
        {reference === 'actualPingSize' && hasApiKey && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl animate-fade-in">
            <div>
              <label htmlFor="custom-size" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t('customActualPingSize')}
              </label>
              <input
                id="custom-size"
                type="number"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                placeholder={t('enterPingSizePlaceholder')}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
                disabled={isLoading}
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="custom-price" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t('customReferenceUnitPrice')}
              </label>
              <input
                id="custom-price"
                type="number"
                value={customPricePerPing}
                onChange={(e) => setCustomPricePerPing(e.target.value)}
                placeholder={t('enterUnitPricePlaceholder')}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
                disabled={isLoading}
                step="0.1"
              />
            </div>
            <div className="sm:col-span-2">
               <label htmlFor="custom-floor" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t('customFloor')}
              </label>
              <input
                  id="custom-floor"
                  type="text"
                  value={customFloor}
                  onChange={(e) => setCustomFloor(e.target.value)}
                  placeholder={t('enterFloorPlaceholder')}
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
                  disabled={isLoading}
              />
            </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2 italic">
                {t('customInputNote')}
            </p>
          </div>
        )}

        {/* Custom Request Input for '自訂估價指令' */}
        {reference === 'customValuation' && hasApiKey && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl animate-fade-in">
                 <label htmlFor="custom-request" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    {t('customValuationLabel')}
                 </label>
                 <textarea
                    id="custom-request"
                    value={customRequest}
                    onChange={(e) => setCustomRequest(e.target.value)}
                    placeholder={t('customValuationPlaceholder')}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 h-24 resize-none"
                    disabled={isLoading}
                 />
            </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !address.trim() || !hasApiKey}
          title={!hasApiKey ? t('valuationDisabledTooltip') : ''}
          className="w-full group relative flex justify-center items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 hover:-translate-y-1 overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out blur-md"></div>
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('valuating')}
            </>
          ) : (
            <>
              <SparklesIcon className="h-6 w-6 animate-pulse" />
              {t('aiValuationButton')}
            </>
          )}
        </button>
      </div>
      {showApiKeyWarning && (
        <div className="mt-6 animate-fade-in text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex justify-between items-center shadow-sm" role="alert">
            {currentUser?.role === '管理員' || currentUser?.role === '付費用戶' ? (
                <div>
                    <span className="font-medium">{t('apiKeyWarning')}</span>
                    <button 
                        type="button" 
                        onClick={() => setSettingsModalOpen(true)} 
                        className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200 ml-2"
                    >
                        {t('clickHereToSettings')}
                    </button>
                </div>
            ) : (
                <span>{t('adminApiKeySetupRequired')}</span>
            )}
        </div>
      )}
      {geolocationError && (
        <div className="mt-6 animate-fade-in text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-center shadow-sm" role="alert">
          <span className="font-medium">{geolocationError}</span>
          <button 
            type="button" 
            onClick={() => setGeolocationError(null)} 
            className="text-red-800 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full p-1"
            aria-label={t('closeErrorMessage')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </form>
  );
};
