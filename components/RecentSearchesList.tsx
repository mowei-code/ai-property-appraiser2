
import React, { useContext, useState } from 'react';
import type { Property } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SettingsContext } from '../contexts/SettingsContext';

interface RecentSearchesListProps {
  searches: Property[];
  onSelect: (property: Property) => void;
  comparisonList: Property[];
  onToggleCompare: (property: Property) => void;
}

export const RecentSearchesList: React.FC<RecentSearchesListProps> = ({ searches, onSelect, comparisonList, onToggleCompare }) => {
  const { t } = useContext(SettingsContext);
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-black dark:border-gray-600 overflow-hidden transition-all duration-300">
      <div 
        className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 select-none">
            <ClockIcon className="h-6 w-6" />
            {t('recentSearches')}
        </h3>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
            <div className="pt-4">
                {searches.length === 0 ? (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">
                    {t('yourSearchHistoryHere')}
                </p>
                ) : (
                <div className="space-y-2">
                    {searches.map(property => {
                    const isInCompareList = comparisonList.some(p => p.id === property.id);
                    return (
                        <div key={`${property.id}-${property.address}`} className="flex items-center gap-2">
                        <button
                            onClick={() => onSelect(property)}
                            className="flex-grow text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                            aria-label={`${t('searchForAddress')}: ${property.address}`}
                        >
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{property.address}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{property.district}</p>
                        </button>
                        <button
                            onClick={() => onToggleCompare(property)}
                            className={`flex-shrink-0 p-2 rounded-full transition-colors ${isInCompareList ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-800' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                            title={isInCompareList ? t('removeFromCompare') : t('addToCompare')}
                        >
                            {isInCompareList ? <CheckCircleIcon className="h-6 w-6" /> : <PlusCircleIcon className="h-6 w-6" />}
                        </button>
                        </div>
                    );
                    })}
                </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
