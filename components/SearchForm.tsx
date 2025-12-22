
import React, { useState, useEffect, useContext } from 'react';
import { MapPinIcon } from './icons/MapPinIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { BuildingLibraryIcon } from './icons/BuildingLibraryIcon';
import { MapIcon } from './icons/MapIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { TruckIcon } from './icons/TruckIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { formatNominatimAddress } from '../utils';
import type { User } from '../types';
import { SettingsContext } from '../contexts/SettingsContext';
import { LoadingOverlay } from './LoadingOverlay';

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
    { value: 'comprehensiveMarketFactors', label: t('comprehensiveMarketFactors'), desc: t('desc_comprehensiveMarketFactors'), icon: GlobeAltIcon },
    { value: 'actualTransactions', label: t('actualTransactions'), desc: t('desc_actualTransactions'), icon: ListBulletIcon },
    { value: 'realtorPerspective', label: t('realtorPerspective'), desc: t('desc_realtorPerspective'), icon: ChatBubbleLeftRightIcon },
    { value: 'actualPingSize', label: t('actualPingSize'), desc: t('desc_actualPingSize'), icon: CalculatorIcon },
    { value: 'regionalDevelopmentPotential', label: t('regionalDevelopmentPotential'), desc: t('desc_regionalDevelopmentPotential'), icon: ArrowTrendingUpIcon },
    { value: 'foreclosureInfo', label: t('foreclosureInfo'), desc: t('desc_foreclosureInfo'), icon: ScaleIcon },
    { value: 'rentalYieldAnalysis', label: t('rentalYieldAnalysis'), desc: t('desc_rentalYieldAnalysis'), icon: DocumentArrowDownIcon },
    { value: 'bankAppraisalModel', label: t('bankAppraisalModel'), desc: t('desc_bankAppraisalModel'), icon: BuildingLibraryIcon },
    { value: 'urbanRenewalPotential', label: t('urbanRenewalPotential'), desc: t('desc_urbanRenewalPotential'), icon: MapIcon },
    { value: 'commercialValue', label: t('commercialValue'), desc: t('desc_commercialValue'), icon: ShoppingCartIcon },
    { value: 'structureSafety', label: t('structureSafety'), desc: t('desc_structureSafety'), icon: ShieldCheckIcon },
    { value: 'trafficRoutePlanning', label: t('trafficRoutePlanning'), desc: t('desc_trafficRoutePlanning'), icon: TruckIcon },
    { value: 'customValuation', label: t('customValuation'), desc: t('desc_customValuation'), icon: SparklesIcon },
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
    'trafficRoutePlanning',
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
  const [isBasisModalOpen, setIsBasisModalOpen] = useState(false);

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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                設置完成自己的 Gemini API Key 即可啟動基本功能。
                {!userHasPermission && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSettingsModalOpen(true, 'upgrade')}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium mx-1"
                    >
                      升級為付費會員
                    </button>
                    可解鎖全部進階分析功能。
                  </>
                )}
              </p>
            )}
          </div>

          {/* Desktop Grid View (Hidden on Mobile) */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {valuationReferences.map((ref) => {
              const isRestricted = restrictedReferences.includes(ref.value);
              const isDisabledByPerms = isRestricted && !userHasPermission;
              const isDisabled = !hasApiKey || isDisabledByPerms;
              const isCustomAI = ref.value === 'customValuation';

              let tooltip = '';
              if (!hasApiKey) {
                tooltip = t('valuationDisabledTooltip');
              } else if (isDisabledByPerms) {
                tooltip = t('premiumFeatureTooltip');
              }

              const isSelected = reference === ref.value;
              const Icon = ref.icon;

              return (
                <div key={ref.value} title={tooltip} className={`${isCustomAI ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
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
                        relative block h-full p-4 rounded-2xl transition-all duration-300 cursor-pointer select-none border-2 overflow-hidden
                        ${isSelected
                        ? isCustomAI
                          ? 'bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.4)] ring-2 ring-indigo-500/50'
                          : (ref.value === 'comprehensiveMarketFactors' && hasApiKey)
                            ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-white dark:bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800'
                      }
                        ${isDisabled ? 'opacity-50 cursor-not-allowed filter grayscale bg-slate-100 dark:bg-slate-900/50' : ''}
                        ${isSelected ? 'scale-[1.02] z-10' : 'scale-100'}
                      `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                          p-2.5 rounded-xl transition-colors
                          ${isSelected
                          ? isCustomAI
                            ? 'bg-indigo-500 text-white'
                            : (ref.value === 'comprehensiveMarketFactors' && hasApiKey)
                              ? 'bg-emerald-500 text-white'
                              : 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200'
                        }
                        `}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className={`
                            text-base font-bold mb-0.5 flex items-center gap-2
                            ${isSelected
                            ? isCustomAI
                              ? 'text-white'
                              : (ref.value === 'comprehensiveMarketFactors' && hasApiKey)
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-900 dark:text-white'
                          }
                          `}>
                          {ref.label}
                          {isDisabledByPerms && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                        <p className={`
                            text-xs leading-relaxed line-clamp-2
                            ${isSelected
                            ? isCustomAI
                              ? 'text-indigo-200'
                              : (ref.value === 'comprehensiveMarketFactors' && hasApiKey)
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-500 dark:text-slate-400'
                          }
                          `}>
                          {ref.desc}
                        </p>
                      </div>
                    </div>

                    {/* Sparkle background for Custom AI */}
                    {isCustomAI && isSelected && (
                      <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-20">
                        <SparklesIcon className="h-12 w-12 text-indigo-400 animate-pulse" />
                      </div>
                    )}

                  </label>
                </div>
              )
            })}
          </div>

          {/* Mobile Collapsible View */}
          <div className="block sm:hidden space-y-3">
            {/* Selected Status Card (Preserves Visual State) */}
            <div className={`
              relative p-4 rounded-2xl border-2 transition-all duration-300
              ${reference === 'customValuation'
                ? 'bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-500 shadow-lg ring-2 ring-indigo-500/50'
                : (reference === 'comprehensiveMarketFactors' && hasApiKey)
                  ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-md'
                  : 'bg-white dark:bg-slate-800 border-blue-500 shadow-md'
              }
            `}>
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={`
                  p-2.5 rounded-xl flex-shrink-0
                  ${reference === 'customValuation'
                    ? 'bg-indigo-500 text-white'
                    : (reference === 'comprehensiveMarketFactors' && hasApiKey)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-500 text-white'
                  }
                `}>
                  {(() => {
                    const Icon = valuationReferences.find(r => r.value === reference)?.icon || GlobeAltIcon;
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-base font-bold truncate 
                    ${reference === 'customValuation'
                      ? 'text-white'
                      : (reference === 'comprehensiveMarketFactors' && hasApiKey)
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }
                  `}>
                    {valuationReferences.find(r => r.value === reference)?.label}
                  </div>
                  <div className={`text-xs line-clamp-2 leading-relaxed whitespace-normal
                    ${reference === 'customValuation'
                      ? 'text-indigo-200'
                      : (reference === 'comprehensiveMarketFactors' && hasApiKey)
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  `}>
                    {valuationReferences.find(r => r.value === reference)?.desc}
                  </div>
                </div>
              </div>
            </div>

            {/* Explicit Change Button & Description */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('changeValuationBasis')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('clickToSelectOthers')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBasisModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-colors"
                aria-label={t('changeValuationBasis')}
              >
                <span>{t('select')}</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Selection Modal */}
            {isBasisModalOpen && (
              <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50 dark:bg-slate-900 animate-fade-in">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('valuationBasis')}
                  </h3>
                  <button
                    onClick={() => setIsBasisModalOpen(false)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Modal Content - Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {valuationReferences.map((ref) => {
                    const isRestricted = restrictedReferences.includes(ref.value);
                    const isDisabledByPerms = isRestricted && !userHasPermission;
                    const isDisabled = !hasApiKey || isDisabledByPerms;
                    const isCustomAI = ref.value === 'customValuation';
                    const isSelected = reference === ref.value;
                    const Icon = ref.icon;

                    return (
                      <button
                        key={ref.value}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            setReference(ref.value);
                            setIsBasisModalOpen(false);
                          }
                        }}
                        disabled={isDisabled}
                        className={`
                          w-full text-left relative p-4 rounded-xl border-2 transition-all duration-200
                          ${isSelected
                            ? isCustomAI
                              ? 'bg-indigo-900/10 border-indigo-500'
                              : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }
                          ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale' : 'active:scale-[0.98]'}
                        `}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            p-2 rounded-lg flex-shrink-0
                            ${isSelected
                              ? isCustomAI ? 'bg-indigo-500 text-white' : 'bg-blue-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }
                          `}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-0.5">
                              {ref.label}
                              {isDisabledByPerms && (
                                <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded text-normal font-normal">
                                  LOCKED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {ref.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0 text-blue-500">
                              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Bottom spacer for safe area */}
                  <div className="h-8"></div>
                </div>
              </div>
            )}
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
          <div className={`p-6 bg-slate-950 border-2 border-indigo-500/50 rounded-2xl animate-fade-in shadow-[0_0_20px_rgba(99,102,241,0.2)]`}>
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="h-5 w-5 text-indigo-400" />
              <label htmlFor="custom-request" className="block text-sm font-bold text-indigo-100">
                {t('customValuationLabel')}
              </label>
            </div>
            <textarea
              id="custom-request"
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              placeholder={t('customValuationPlaceholder')}
              className="w-full px-4 py-3 border border-indigo-500/30 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-900 text-white placeholder-slate-500 h-32 resize-none transition-all"
              disabled={isLoading}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: t('customValuation_template_view_label'), text: t('customValuation_template_view_text') },
                { label: t('customValuation_template_renovation_label'), text: t('customValuation_template_renovation_text') },
                { label: t('customValuation_template_nimby_label'), text: t('customValuation_template_nimby_text') },
                { label: t('customValuation_template_club_label'), text: t('customValuation_template_club_text') }
              ].map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => setCustomRequest(template.text)}
                  className="px-3 py-1.5 text-xs bg-slate-800 text-indigo-300 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="relative group">
          {isLoading && <LoadingOverlay message={t('analyzing')} />}
          <button
            type="submit"
            disabled={isLoading || !address.trim() || !hasApiKey}
            title={!hasApiKey ? t('valuationDisabledTooltip') : ''}
            className="w-full group relative flex justify-center items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out blur-md"></div>
            <SparklesIcon className="h-6 w-6 animate-pulse" />
            {t('aiValuationButton')}
          </button>
        </div>
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
