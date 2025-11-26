
import React, { useContext, useState } from 'react';
import type { Property, Filters } from '../types';
import { PropertyCard } from './PropertyCard';
import {
  PROPERTY_TYPES,
  PRICE_RANGES,
  BEDROOM_OPTIONS,
  YEAR_BUILT_RANGES,
  PRICE_PER_SQM_RANGES,
  SIZE_RANGES
} from '../constants';
import { applyFilters } from '../utils';
import { ScaleIcon } from './icons/ScaleIcon';
import { LinkIcon } from './icons/LinkIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SettingsContext } from '../contexts/SettingsContext';

interface FavoritesListProps {
  properties: Property[];
  favorites: Property[];
  filters: Filters;
  onSelectProperty: (property: Property) => void;
  onToggleFavorite: (property: Property) => void;
  onFilterChange: (name: keyof Filters, value: string) => void;
  onClearFilters: () => void;
  comparisonList: Property[];
  onToggleCompare: (property: Property) => void;
}

const FilterSelect: React.FC<{
  label: string;
  name: keyof Filters;
  value: string;
  options: readonly { value: string; label: string }[] | { value: string; label: string }[];
  onChange: (name: keyof Filters, value: string) => void;
}> = ({ label, name, value, options, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {label}
    </label>
    <select
      id={name}
      name={name}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    >
      {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      )}
    </select>
  </div>
);


export const FavoritesList: React.FC<FavoritesListProps> = ({
  properties,
  favorites,
  filters,
  onSelectProperty,
  onToggleFavorite,
  onFilterChange,
  onClearFilters,
  comparisonList,
  onToggleCompare,
}) => {
  const { t, settings } = useContext(SettingsContext);
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredProperties = applyFilters(properties, filters);

  const filterOptions = [
    { label: t('filterType'), name: 'type', options: [{ value: 'all', label: t('allTypes') }, ...PROPERTY_TYPES.map(type => ({value: type, label: t(type)}))] },
    { label: t('filterPrice'), name: 'price', options: PRICE_RANGES.map(o => ({ ...o, label: t(`priceRange_${o.value}`) })) },
    { label: t('filterLayout'), name: 'bedrooms', options: BEDROOM_OPTIONS.map(o => ({...o, label: t(`bedroomOption_${o.value}`)})) },
    { label: t('filterAge'), name: 'yearBuilt', options: YEAR_BUILT_RANGES.map(o => ({...o, label: t(`yearBuiltRange_${o.value}`)})) },
    { label: t('filterSize'), name: 'size', options: SIZE_RANGES.map(o => ({...o, label: t(`sizeRange_${o.value}`)})) },
    { label: t('filterUnitPrice'), name: 'pricePerSqm', options: PRICE_PER_SQM_RANGES.map(o => ({...o, label: t(`pricePerSqmRange_${o.value}`)})) }
  ] as const;
  
  const DataSourceIndicator: React.FC = () => {
    return (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" title={t('dataSourceBuiltInTooltip')}>
             <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
            </span>
            {t('dataSourceBuiltIn')}
        </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-black dark:border-gray-600 overflow-hidden transition-all duration-300">
      <div 
        className="p-6 flex flex-wrap justify-between items-center gap-y-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 select-none">
            <ScaleIcon className="h-6 w-6" />
            {t('nearbyMarketPrices')}
            <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </h3>
        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <DataSourceIndicator />
            <a 
              href="https://lvr.land.moi.gov.tw/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title={t('dataSourceMoi')}
            >
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dataSource')}</span>
            </a>
            {isOpen && (
                <button
                  onClick={onClearFilters}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {t('clearFilters')}
                </button>
            )}
        </div>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
            {filterOptions.map(filter => (
              <FilterSelect
                key={filter.name}
                label={filter.label}
                name={filter.name}
                value={filters[filter.name]}
                options={filter.options}
                onChange={onFilterChange}
              />
            ))}
          </div>

          <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 -mr-2">
            {filteredProperties.length > 0 ? (
              filteredProperties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={onSelectProperty}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={favorites.some(fav => fav.id === property.id)}
                  isInCompareList={comparisonList.some(p => p.id === property.id)}
                  onToggleCompare={onToggleCompare}
                  language={settings.language}
                  t={t}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('noPropertiesFound')}
                  <br />
                  {t('noPropertiesFoundHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
