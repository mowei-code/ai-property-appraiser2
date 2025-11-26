import React, { useContext } from 'react';
import type { Property } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { SettingsContext } from '../contexts/SettingsContext';

interface ComparisonTrayProps {
  properties: Property[];
  onCompare: () => void;
  onRemove: (property: Property) => void;
  onClear: () => void;
}

export const ComparisonTray: React.FC<ComparisonTrayProps> = ({ properties, onCompare, onRemove, onClear }) => {
  const { t } = useContext(SettingsContext);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t-2 border-black shadow-2xl z-20 transition-transform duration-300 animate-slide-up">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h4 className="text-sm font-bold text-gray-700 hidden sm:block">{t('comparisonList')}</h4>
            <div className="flex items-center gap-2">
              {properties.map(prop => (
                <div key={prop.id} className="relative group">
                  <img src={prop.imageUrl} alt={prop.address} className="h-12 w-12 rounded-md object-cover border-2 border-gray-300"/>
                  <button 
                    onClick={() => onRemove(prop)}
                    className="absolute -top-2 -right-2 bg-white rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('remove')}
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, index) => (
                <div key={`placeholder-${index}`} className="h-12 w-12 rounded-md bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-lg font-medium">?</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={onClear}
              className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
            >
              {t('clearAll')}
            </button>
            <button
              onClick={onCompare}
              disabled={properties.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              <ScaleIcon className="h-5 w-5"/>
              <span>{t('compare')} ({properties.length})</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};