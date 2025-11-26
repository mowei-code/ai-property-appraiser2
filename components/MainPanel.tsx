
import React, { useContext, useState } from 'react';
import type { Property, ValuationReport, Filters, User } from '../types';
import { SearchForm } from './SearchForm';
import { ValuationReportDisplay } from './ValuationReportDisplay';
import { TabbedInfo } from './TabbedInfo';
import { ScaleIcon } from './icons/ScaleIcon';
import { MapIcon } from './icons/MapIcon';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { AboutModal } from './AboutModal';
import { Header } from './Header';


interface MainPanelProps {
  onSearch: (
    address: string,
    reference: string,
    details?: { coords: { lat: number; lon: number }; district: string; city?: string },
    customInputs?: { size?: number; pricePerPing?: number; floor?: string }
  ) => void;
  onLocationSelect: (
    address: string,
    details: { coords: { lat: number; lon: number }; district: string; city?: string }
  ) => void;
  isLoading: boolean;
  selectedProperty: Property | null;
  valuation: ValuationReport | null;
  isValuating: boolean;
  error: string | null;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  onOpenHistory: () => void;
  transactionList: Property[];
  filters: Filters;
  onSelectProperty: (property: Property) => void;
  onFilterChange: (name: keyof Filters, value: string) => void;
  onClearFilters: () => void;
  comparisonList: Property[];
  onToggleCompare: (property: Property) => void;
  recentSearches: Property[];
  onSelectRecent: (property: Property) => void;
  onCompareClick: () => void;
  onOpenMap: () => void;
  onOpenInstructionManual: () => void;
  currentUser: User | null;
  onOpenSettings: () => void;
  loadingMessage: string;
}

export const MainPanel: React.FC<MainPanelProps> = (props) => {
  const { t, settings } = useContext(SettingsContext);
  const [isAboutModalOpen, setAboutModalOpen] = useState(false);

  return (
    <div className="space-y-8 pb-20">
      <Header className="mb-6" />
      
      {/* Search & Main Card */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 border border-orange-400 dark:border-orange-500">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('searchForAddress')}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                   {settings.language === 'zh-TW' ? (
                     <>
                       請輸入地址或右邊地圖查詢後
                       <button onClick={props.onOpenSettings} className="text-blue-600 hover:underline mx-1 font-medium inline-block">
                         (設定 Gemini API Key)
                       </button>
                       點擊「AI智慧為您估價參考」按鈕開始。
                     </>
                   ) : (
                     t('startValuationPrompt')
                   )}
                </p>
            </div>
           <button
              onClick={props.onOpenMap}
              className="group relative flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden w-full sm:w-auto"
           >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <MapIcon className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>{t('mapSearch')}</span>
           </button>
        </div>

        <SearchForm 
          onSearch={props.onSearch} 
          onLocationSelect={props.onLocationSelect}
          isLoading={props.isLoading} 
          initialAddress={props.selectedProperty?.address || ''} 
          currentUser={props.currentUser}
        />
        {props.selectedProperty && (
          <ValuationReportDisplay
            property={props.selectedProperty}
            valuation={props.valuation}
            isLoading={props.isValuating}
            error={props.error}
            isFavorite={props.favorites.some(fav => fav.id === props.selectedProperty!.id)}
            onToggleFavorite={() => props.onToggleFavorite(props.selectedProperty!)}
            isValuating={props.isValuating}
            onOpenHistory={props.onOpenHistory}
            currentUser={props.currentUser}
            onOpenSettings={props.onOpenSettings}
            loadingMessage={props.loadingMessage}
          />
        )}
      </div>

      {/* Tabbed Info (Favorites, Recent, etc) */}
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg rounded-[2rem] shadow-sm p-6 border border-orange-400 dark:border-orange-500">
          <TabbedInfo {...props} />
      </div>

      {/* Floating Comparison Bar */}
      {props.comparisonList.length > 0 && (
         <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <div className="pointer-events-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-3 pr-4 rounded-full shadow-2xl border border-orange-300 dark:border-orange-700 flex items-center gap-4 animate-fade-in-up">
                <div className="flex -space-x-3 pl-2">
                    {props.comparisonList.map(p => (
                        <img key={p.id} src={p.imageUrl} alt={p.address} className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-700 ring-1 ring-black/5" title={p.address} />
                    ))}
                </div>
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                <button 
                  onClick={props.onCompareClick} 
                  disabled={props.comparisonList.length < 2}
                  className="flex items-center gap-2 px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full shadow hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    <ScaleIcon className="h-5 w-5"/> 
                    <span>{t('compare')} ({props.comparisonList.length})</span>
                </button>
            </div>
         </div>
      )}
      
      {isAboutModalOpen && (
        <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
      )}

      {/* Footer Links - Moved from header to bottom for cleaner look */}
      <div className="flex justify-center gap-6 text-sm text-slate-400 dark:text-slate-500 pb-4">
         <button onClick={() => props.onOpenInstructionManual()} className="hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors">
            <QuestionMarkCircleIcon className="h-4 w-4" /> {t('instructionManual')}
         </button>
         <button onClick={() => setAboutModalOpen(true)} className="hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition-colors">
            <InformationCircleIcon className="h-4 w-4" /> {t('about')}
         </button>
      </div>

    </div>
  );
};