
import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Property, ValuationReport, Filters, ComparisonValuationState, ValuationHistoryItem } from './types';
import { getValuation } from './services/geminiService';
import { initialFilters, getMockProperties, APP_VERSION, APP_RELEASE_DATE } from './constants';
import { MapView } from './components/MapView';
import { ComparisonView } from './components/ComparisonView';
import { sanitizeAddressForGeocoding, generateRandomPropertyDetails, parseTaiwanAddress } from './utils';
import { getLocalTransactions } from './services/realEstateService';
import { ValuationHistory } from './components/ValuationHistory';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { SettingsProvider, SettingsContext } from './contexts/SettingsContext';
import { LoginModal } from './components/LoginModal';
import { AdminPanel } from './components/AdminPanel';
import { SettingsModal } from './components/SettingsModal';
import { MainPanel } from './components/MainPanel';
import { BuildingOfficeIcon } from './components/icons/BuildingOfficeIcon';
import { InstructionManual } from './components/InstructionManual';
import { QuestionMarkCircleIcon } from './components/icons/QuestionMarkCircleIcon';
import { AboutModal } from './components/AboutModal';


const AppContent: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [valuation, setValuation] = useState<ValuationReport | null>(null);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [recentSearches, setRecentSearches] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isValuating, setIsValuating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [transactionList, setTransactionList] = useState<Property[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [comparisonList, setComparisonList] = useState<Property[]>([]);
  const [comparisonValuations, setComparisonValuations] = useState<Record<string, ComparisonValuationState>>({});
  const [isComparing, setIsComparing] = useState(false);
  const [valuationHistory, setValuationHistory] = useState<ValuationHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isInstructionManualOpen, setInstructionManualOpen] = useState(false);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);

  const { currentUser, isLoginModalOpen, isAdminPanelOpen, setLoginModalOpen } = useContext(AuthContext);
  const { settings, getApiKey, t, setSettingsModalOpen } = useContext(SettingsContext);

  useEffect(() => {
    const resetAndInitialize = () => {
        const currentMockProperties = getMockProperties(settings.language);
        // Reset transient state to defaults
        setSelectedProperty(currentMockProperties[0]);
        setValuation(null);
        setIsLoading(false);
        setError(null);
        setIsValuating(false);
        setFilters(initialFilters);
        setComparisonList([]);
        setComparisonValuations({});
        setIsHistoryOpen(false);
        setIsMapOpen(false);
        setIsComparing(false);
        
        // Load user-specific persisted state or clear it if no user is logged in
        if (currentUser) {
            const userFavoritesKey = `propertyFavorites_${currentUser.email}`;
            const userRecentKey = `propertyRecentSearches_${currentUser.email}`;
            const userHistoryKey = `valuationHistory_${currentUser.email}`;

            try {
                const storedFavorites = localStorage.getItem(userFavoritesKey);
                setFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);

                const storedRecent = localStorage.getItem(userRecentKey);
                setRecentSearches(storedRecent ? JSON.parse(storedRecent) : []);
                
                const storedHistory = localStorage.getItem(userHistoryKey);
                setValuationHistory(storedHistory ? JSON.parse(storedHistory) : []);
            } catch (e) {
                console.error("Failed to parse user data from localStorage:", e);
                setFavorites([]);
                setRecentSearches([]);
                setValuationHistory([]);
            }
        } else {
            // Clear lists if no user is logged in
            setFavorites([]);
            setRecentSearches([]);
            setValuationHistory([]);
        }

        // Initialize default transaction data for the default property
        const defaultProp = currentMockProperties[0];
        if (defaultProp) {
            try {
                const { city, district } = defaultProp;
                if (city && district) {
                    const localData = getLocalTransactions(city, district, settings.language);
                    setTransactionList([defaultProp, ...localData]);
                } else {
                     setTransactionList([defaultProp]);
                }
            } catch (e) {
                console.error("Initialization failed during transaction fetch:", e);
                if (currentMockProperties[0]) {
                   setTransactionList([currentMockProperties[0]]);
                }
            }
        }
    };
    
    resetAndInitialize();
  }, [currentUser, settings.language]);

  const handleFilterChange = useCallback((name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleLocationSelect = useCallback((
    address: string,
    details: { coords: { lat: number; lon: number }; district: string; city?: string }
  ) => {
    setError(null);
    setValuation(null);
    setIsValuating(false);
    setIsLoading(true);

    const { coords, district, city } = details;
    const propertyToUpdate: Property = {
      ...generateRandomPropertyDetails(),
      id: `prop_select_${Date.now()}`,
      address: address,
      latitude: coords.lat,
      longitude: coords.lon,
      city: city,
      district: district,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
      price: 0,
    };

    setSelectedProperty(propertyToUpdate);
    
    if (city && district) {
      const localData = getLocalTransactions(city, district, settings.language);
      setTransactionList([propertyToUpdate, ...localData]);
    } else {
      setTransactionList([propertyToUpdate]);
    }
    setIsLoading(false);
  }, [settings.language]);
  
  const handleSearch = useCallback(async (
    address: string,
    reference: string,
    details?: { coords: { lat: number; lon: number }; district: string; city?: string },
    customInputs?: { size?: number; pricePerPing?: number; floor?: string; customRequest?: string }
  ) => {
    setError(null);
    setValuation(null);
    setIsValuating(true);
    setIsLoading(true);
    setTransactionList([]);
    setLoadingMessage(t('valuating_init'));

    const apiKey = getApiKey();

    if (!apiKey) {
      const errorMessage = (currentUser?.role === '管理員' || currentUser?.role === '付費用戶')
        ? t('apiKeyWarning')
        : t('adminApiKeySetupRequired');
      setError(errorMessage);
      setIsLoading(false);
      setIsValuating(false);
      setLoadingMessage('');
      return;
    }

    let propertyToValuate: Property | null = null;
    
    // Attempt to parse the address string for details (City, District, Floor)
    const parsedLocation = parseTaiwanAddress(address);
    
    // Prepare implicit custom inputs (floor from address)
    let effectiveCustomInputs = customInputs ? { ...customInputs } : {};
    if (!effectiveCustomInputs.floor && parsedLocation.floor) {
        effectiveCustomInputs.floor = parsedLocation.floor;
    }
      
    if (details) {
        const { coords, district, city } = details;
        propertyToValuate = {
          ...generateRandomPropertyDetails(),
          id: `prop_${Date.now()}`,
          address: address,
          latitude: coords.lat,
          longitude: coords.lon,
          city: city,
          district: district,
          imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
          price: 0,
        };
    } else {
        const currentMockProperties = getMockProperties(settings.language);
        propertyToValuate = currentMockProperties.find(p => 
          p.address.trim().toLowerCase() === address.trim().toLowerCase()
        ) || null;
          
        const isSearchingForSelectedProperty = selectedProperty &&
          selectedProperty.address === address &&
          selectedProperty.latitude &&
          selectedProperty.longitude;

        if (!propertyToValuate && address) {
          if (isSearchingForSelectedProperty) {
            propertyToValuate = selectedProperty;
          } else {
            setLoadingMessage(t('valuating_geocoding'));
            try {
              const sanitizedAddress = sanitizeAddressForGeocoding(address);
              let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitizedAddress)}&countrycodes=tw&addressdetails=1&accept-language=zh-TW`);
              if (!response.ok) throw new Error('Geocoding service failed');
              let data = await response.json();
              let isBroadSearch = false;

              if (!data || data.length === 0) {
                  isBroadSearch = true;
                  console.warn(`Geocoding failed for full address: "${sanitizedAddress}". Retrying with a broader search.`);
                  const streetMatch = sanitizedAddress.match(/^(.*?[路街巷段大道])/);
                  if (streetMatch && streetMatch[1]) {
                      const broaderAddress = streetMatch[1];
                      response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(broaderAddress)}&countrycodes=tw&addressdetails=1&accept-language=zh-TW`);
                      if (response.ok) {
                          data = await response.json();
                      }
                  }
              }

              if (data && data.length > 0) {
                  const { lat, lon, address: addrDetails } = data[0];
                  
                  let displayAddress = address; 
                  if (!isBroadSearch && addrDetails) {
                      const hn = addrDetails.house_number ? String(addrDetails.house_number).trim() : '';
                      const houseNumberPart = hn ? (hn.endsWith('號') ? hn : `${hn}號`) : '';
                      const addressParts = [
                        addrDetails.city || addrDetails.county,
                        addrDetails.suburb || addrDetails.city_district,
                        addrDetails.road,
                        houseNumberPart
                      ];
                      const tempAddress = addressParts.filter(Boolean).join('');
                      if (tempAddress) {
                          // Keep original input for display if it's more detailed (e.g. includes floor)
                          if (address.length > tempAddress.length) {
                             displayAddress = address;
                          } else {
                             displayAddress = tempAddress;
                          }
                      }
                  }

                  // Determine District: Prioritize User Input Parsing -> Geocoding Result -> Fallback
                  // Geocoding services can sometimes return incorrect districts for border areas or incomplete addresses.
                  // If the user explicitly typed "Da'an District", we should respect that over a potential geocode error.
                  const effectiveCity = parsedLocation.city || addrDetails.city || addrDetails.county;
                  const effectiveDistrict = parsedLocation.district || addrDetails.suburb || addrDetails.city_district || '未知區域';

                  propertyToValuate = {
                      ...generateRandomPropertyDetails(),
                      id: `prop_${Date.now()}`,
                      address: displayAddress,
                      latitude: parseFloat(lat),
                      longitude: parseFloat(lon),
                      city: effectiveCity,
                      district: effectiveDistrict,
                      imageUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
                      price: 0,
                  };

                  if (isBroadSearch) {
                      setError('無法精確定位地址，已顯示該路段的大致位置。您可以在地圖上拖動標記以修正。');
                  }
              } else {
                  throw new Error('地址無法定位。請嘗試輸入更完整的地址，例如包含「縣市」與「區域」。');
              }
            } catch (geoError) {
              console.error("Geocoding error:", geoError);
              const errorMessage = geoError instanceof Error ? geoError.message : '地址定位時發生未知錯誤。';
              setError(errorMessage);
              const tempErrorProperty: Property = {
                ...(getMockProperties(settings.language)[0]),
                id: `error_${Date.now()}`,
                address: address,
              };
              setSelectedProperty(tempErrorProperty);
              setTransactionList([tempErrorProperty]);
              setIsLoading(false);
              setIsValuating(false);
              setLoadingMessage('');
              return; 
            }
          }
        }
    }
    
    if (!propertyToValuate) {
        setError('請輸入有效的地址。');
        setTransactionList([]);
        setIsLoading(false);
        setIsValuating(false);
        setLoadingMessage('');
        return;
    }

    setRecentSearches(prevSearches => {
        const filtered = prevSearches.filter(p => p.address !== propertyToValuate!.address);
        const updatedSearches = [propertyToValuate!, ...filtered];
        const cappedSearches = updatedSearches.slice(0, 5);
        if (currentUser) {
            localStorage.setItem(`propertyRecentSearches_${currentUser.email}`, JSON.stringify(cappedSearches));
        }
        return cappedSearches;
    });

    setSelectedProperty(propertyToValuate);
    
    const performValuation = async (contextTransactions: Property[]) => {
      try {
        const getLoadingMessageForReference = (refKey: string): string => {
          const key = `valuating_${refKey}`;
          const translated = t(key);
          return translated !== key ? translated : t('valuating_ai');
        };
        setLoadingMessage(getLoadingMessageForReference(reference));
        
        const report = await getValuation(
            propertyToValuate!, 
            contextTransactions.slice(0, 10), 
            t(reference), 
            apiKey, 
            settings.language, 
            reference, 
            Object.keys(effectiveCustomInputs).length > 0 ? effectiveCustomInputs : undefined
        );
        setValuation(report);
        const newHistoryItem: ValuationHistoryItem = {
          property: propertyToValuate!,
          report: report,
          date: new Date().toISOString(),
        };
        setValuationHistory(prevHistory => {
            const updatedHistory = [newHistoryItem, ...prevHistory].slice(0, 10);
            if (currentUser) {
                localStorage.setItem(`valuationHistory_${currentUser.email}`, JSON.stringify(updatedHistory));
            }
            return updatedHistory;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '估價時發生未知錯誤，請稍後再試。';
        setError(errorMessage);
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsValuating(false);
        setLoadingMessage('');
      }
    };

    const { city, district } = propertyToValuate;

    if (city && district) {
      setLoadingMessage(t('valuating_local_data'));
      const localData = getLocalTransactions(city, district, settings.language);
      const initialTransactions = [propertyToValuate, ...localData];
      setTransactionList(initialTransactions);

      await performValuation(localData);
      
    } else {
      setTransactionList([propertyToValuate]);
      await performValuation([]);
    }
  }, [selectedProperty, currentUser, getApiKey, settings.language, t]);

  const handleToggleCompare = useCallback(async (property: Property) => {
    const apiKey = getApiKey();
    setComparisonList(prev => {
      const isInList = prev.some(p => p.id === property.id);
      if (isInList) {
        return prev.filter(p => p.id !== property.id);
      } else {
        if (prev.length >= 4) {
            alert('最多只能比較 4 個房產。');
            return prev;
        }
        if (!comparisonValuations[property.id] || comparisonValuations[property.id].error) {
           if (!apiKey) {
                alert('請先在設定中提供您的 Gemini API Key 以進行比較估價。');
                return prev;
           }
           setComparisonValuations(prevVals => ({
              ...prevVals,
              [property.id]: { report: null, isLoading: true, error: null }
            }));
           const { city, district } = property;
           if (city && district) {
                const contextData = getLocalTransactions(city, district, settings.language);
                getValuation(property, contextData.slice(0, 10), t('comprehensiveMarketFactors'), apiKey, settings.language, 'comprehensiveMarketFactors')
                .then(report => {
                    setComparisonValuations(prevVals => ({
                       ...prevVals,
                       [property.id]: { report, isLoading: false, error: null }
                    }));
                })
                .catch(err => {
                    const errorMessage = err instanceof Error ? err.message : '估價失敗';
                    setComparisonValuations(prevVals => ({
                       ...prevVals,
                       [property.id]: { report: null, isLoading: false, error: errorMessage }
                    }));
                });
           }
        }
        return [...prev, property];
      }
    });
  }, [comparisonValuations, getApiKey, settings.language, t]);
  
  const handleClearCompare = () => setComparisonList([]);

  const toggleFavorite = (property: Property) => {
    let updatedFavorites;
    if (favorites.some(fav => fav.id === property.id)) {
      updatedFavorites = favorites.filter(fav => fav.id !== property.id);
    } else {
      updatedFavorites = [...favorites, property];
    }
    setFavorites(updatedFavorites);
    if (currentUser) {
        localStorage.setItem(`propertyFavorites_${currentUser.email}`, JSON.stringify(updatedFavorites));
    }
  };
  
  const selectPropertyFromList = (property: Property) => {
    setSelectedProperty(property);
    setValuation(null);
    setIsValuating(false);
    
    const { city, district } = property;
    if (city && district) {
        const localData = getLocalTransactions(city, district, settings.language);
        setTransactionList([property, ...localData]);
    } else {
         setTransactionList([property]);
    }
  };
  
  const handleMapMarkerSelect = (property: Property) => {
    setSelectedProperty(property);
    setValuation(null);
    setIsValuating(false);
  };
  
  const handleSelectRecent = (property: Property) => {
    handleSearch(
      property.address, 
      'comprehensiveMarketFactors', 
      property.latitude && property.longitude 
        ? { coords: { lat: property.latitude, lon: property.longitude }, city: property.city, district: property.district } 
        : undefined
    );
  };
  
  const handleSelectHistory = (property: Property) => {
    handleSearch(
      property.address,
      'actualTransactions',
      property.latitude && property.longitude
        ? { coords: { lat: property.latitude, lon: property.longitude }, city: property.city, district: property.district }
        : undefined
    );
    setIsHistoryOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {currentUser ? (
        <main className="flex-grow p-4 sm:p-6 max-w-5xl mx-auto w-full pt-6">
          <MainPanel 
            onSearch={handleSearch}
            onLocationSelect={handleLocationSelect}
            isLoading={isLoading}
            selectedProperty={selectedProperty}
            valuation={valuation}
            isValuating={isValuating}
            error={error}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onOpenHistory={() => setIsHistoryOpen(true)}
            transactionList={transactionList}
            filters={filters}
            onSelectProperty={selectPropertyFromList}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            comparisonList={comparisonList}
            onToggleCompare={handleToggleCompare}
            recentSearches={recentSearches}
            onSelectRecent={handleSelectRecent}
            onCompareClick={() => setIsComparing(true)}
            onOpenMap={() => setIsMapOpen(true)}
            onOpenInstructionManual={() => setInstructionManualOpen(true)}
            currentUser={currentUser}
            onOpenSettings={() => setSettingsModalOpen(true)}
            loadingMessage={loadingMessage}
          />
        </main>
      ) : (
        <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white/80 backdrop-blur-md dark:bg-slate-800/80 p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-slate-700 max-w-lg animate-fade-in-up">
                <div className="mx-auto bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30 inline-block mb-6 transform hover:scale-110 transition-transform duration-300">
                    <BuildingOfficeIcon className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">{t('welcomeMessageTitle')}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                    {t('welcomeMessageBody')}
                </p>
                <div className="flex items-center justify-center gap-3 w-full">
                    {/* Spacer for visual balance on desktop to ensure the main button is perfectly centered */}
                    <div className="w-[54px] hidden sm:block" aria-hidden="true"></div>

                    <button
                        onClick={() => setLoginModalOpen(true)}
                        className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex-grow sm:flex-grow-0"
                    >
                        {t('loginOrRegister')}
                    </button>
                    <button
                        onClick={() => setInstructionManualOpen(true)}
                        className="p-3.5 bg-white/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 rounded-full shadow-lg hover:bg-white dark:hover:bg-slate-600 transition-all duration-200 hover:-translate-y-0.5 border border-slate-200 dark:border-slate-600"
                        title={t('instructionManual')}
                    >
                        <QuestionMarkCircleIcon className="h-6 w-6" />
                    </button>
                </div>
                <p style={{ fontSize: '10px' }} className="mt-6 text-slate-400 dark:text-slate-500">
                    &copy; Mazylab studio {APP_VERSION} • {APP_RELEASE_DATE}
                </p>
            </div>
        </main>
      )}
      
      {isMapOpen && currentUser && (
        <div 
            className="fixed top-20 right-4 bottom-4 z-40 bg-white/90 backdrop-blur-xl dark:bg-slate-800/90 rounded-3xl shadow-2xl w-[90vw] md:w-[60vw] lg:w-[45vw] xl:w-[40%] max-w-[700px] flex flex-col overflow-hidden border border-white/20 dark:border-slate-700 animate-slide-in-right"
        >
            <MapView
                property={selectedProperty}
                properties={transactionList}
                filters={filters}
                onSelectProperty={selectPropertyFromList}
                onMapMarkerSelect={handleMapMarkerSelect}
                onLocationSelect={handleLocationSelect}
                onClose={() => setIsMapOpen(false)}
            />
        </div>
      )}

      {isComparing && currentUser && (
        <ComparisonView 
          properties={comparisonList}
          valuations={comparisonValuations}
          onClose={() => setIsComparing(false)}
          onRemove={handleToggleCompare}
          onClear={handleClearCompare}
        />
      )}
      {isHistoryOpen && currentUser && (
        <ValuationHistory
          history={valuationHistory}
          onClose={() => setIsHistoryOpen(false)}
          onSelect={handleSelectHistory}
        />
      )}
      {isInstructionManualOpen && (
        <InstructionManual
          isOpen={isInstructionManualOpen}
          onClose={() => setInstructionManualOpen(false)}
        />
      )}
      {isAboutModalOpen && (
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
      )}
      {isLoginModalOpen && <LoginModal />}
      {isAdminPanelOpen && currentUser?.role === '管理員' && <AdminPanel />}
      {currentUser && <SettingsModal />}
       <style>{`
        @keyframes slide-in-right {
          from { 
            transform: translateX(100%); 
            opacity: 0;
          }
          to { 
            transform: translateX(0); 
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
         @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  </AuthProvider>
);

export default App;
