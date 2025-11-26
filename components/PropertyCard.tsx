
import React from 'react';
import type { Property, Language } from '../types';
import { StarIconSolid } from './icons/StarIconSolid';
import { StarIconOutline } from './icons/StarIconOutline';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TagIcon } from './icons/TagIcon';
import { isSpecialTransaction, formatDisplayPrice } from '../utils';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onToggleFavorite: (property: Property) => void;
  isFavorite: boolean;
  isInCompareList: boolean;
  onToggleCompare: (property: Property) => void;
  language: Language;
  t: (key: string) => string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect, onToggleFavorite, isFavorite, isInCompareList, onToggleCompare, language, t }) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection when toggling favorite
    onToggleFavorite(property);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompare(property);
  };

  const showSpecialTransactionTag = isSpecialTransaction(property);

  const details = [
    property.district,
    property.type ? t(property.type) : null,
    property.floor,
    property.size ? `${(property.size / 3.30579).toFixed(1)} ${t('pings')}` : null,
  ].filter(Boolean).join(' • ');

  return (
    <div 
      onClick={() => onSelect(property)}
      className="group flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-2xl cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-none dark:hover:bg-slate-700/80 border border-slate-100 dark:border-slate-700 hover:-translate-y-0.5"
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
          <img 
            src={property.imageUrl} 
            alt={property.address} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
           />
      </div>
      
      <div className="flex-grow min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{property.address}</p>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
            {details && <span className="truncate">{details}</span>}
            
            {showSpecialTransactionTag && (
               <span 
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold text-[10px]"
                  title={property.remarks}
                >
                    <TagIcon className="h-3 w-3" />
                    {t('specialTransaction')}
                </span>
            )}
        </div>
        <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{formatDisplayPrice(property.price, t, language)}</p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <button 
          onClick={handleFavoriteClick} 
          className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-yellow-500 transition-colors"
          title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
          {isFavorite ? <StarIconSolid className="h-5 w-5 text-yellow-400" /> : <StarIconOutline className="h-5 w-5" />}
        </button>
        <button
          onClick={handleCompareClick}
          className={`p-1.5 rounded-full transition-colors ${isInCompareList ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-700'}`}
          title={isInCompareList ? t('removeFromCompare') : t('addToCompare')}
        >
          {isInCompareList ? <CheckCircleIcon className="h-5 w-5" /> : <PlusCircleIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};
