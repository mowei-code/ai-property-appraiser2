
import React, { useState, useContext } from 'react';
import type { Property, Filters } from '../types';
import { FavoritesList } from './FavoritesList';
import { RecentSearchesList } from './RecentSearchesList';
import { ScaleIcon } from './icons/ScaleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { HeartIcon } from './icons/HeartIcon';
import { SettingsContext } from '../contexts/SettingsContext';


interface TabbedInfoProps {
  transactionList: Property[];
  favorites: Property[];
  filters: Filters;
  onSelectProperty: (property: Property) => void;
  onToggleFavorite: (property: Property) => void;
  onFilterChange: (name: keyof Filters, value: string) => void;
  onClearFilters: () => void;
  comparisonList: Property[];
  onToggleCompare: (property: Property) => void;
  recentSearches: Property[];
  onSelectRecent: (property: Property) => void;
  selectedProperty: Property | null;
}

type ActiveTab = 'market' | 'recents' | 'favorites';

export const TabbedInfo: React.FC<TabbedInfoProps> = (props) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('market');
  const { t } = useContext(SettingsContext);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'market', label: t('nearbyMarketPrices'), icon: ScaleIcon },
    { id: 'recents', label: t('recentSearches'), icon: ClockIcon },
    { id: 'favorites', label: t('myFavorites'), icon: HeartIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return (
          <FavoritesList
            properties={props.transactionList.filter(p => p.id !== props.selectedProperty?.id)}
            favorites={props.favorites}
            filters={props.filters}
            onSelectProperty={props.onSelectProperty}
            onToggleFavorite={props.onToggleFavorite}
            onFilterChange={props.onFilterChange}
            onClearFilters={props.onClearFilters}
            comparisonList={props.comparisonList}
            onToggleCompare={props.onToggleCompare}
          />
        );
      case 'recents':
        return (
          <RecentSearchesList
            searches={props.recentSearches}
            onSelect={props.onSelectRecent}
            comparisonList={props.comparisonList}
            onToggleCompare={props.onToggleCompare}
          />
        );
      case 'favorites':
        return (
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-black dark:border-gray-600">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                    <HeartIcon className="h-6 w-6" />
                    {t('myFavorites')}
                </h3>
                 {props.favorites.length > 0 ? (
                    <div className="space-y-2">
                        {props.favorites.map(fav => (
                            <div key={fav.id} className="flex items-center gap-2">
                                <button
                                    onClick={() => props.onSelectProperty(fav)}
                                    className="flex-grow text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-150"
                                >
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{fav.address}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{fav.district}</p>
                                </button>
                                <button
                                    onClick={() => props.onToggleFavorite(fav)}
                                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full"
                                    title={t('removeFromFavorites')}
                                >
                                    <HeartIcon className="h-6 w-6" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">
                        {t('yourFavoritesListEmpty')}
                    </p>
                )}
           </div>
        );
    }
  };

  return (
    <div>
      <div className="border-b border-gray-300 dark:border-gray-700 mb-4">
        <nav className="flex space-x-2" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg
                transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 dark:border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        {renderContent()}
      </div>
    </div>
  );
};
