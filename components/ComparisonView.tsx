import React, { useContext } from 'react';
import type { Property, ValuationReport, ComparisonValuationState } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { TrashIcon } from './icons/TrashIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SettingsContext } from '../contexts/SettingsContext';
import { formatDisplayPrice, formatUnitPrice } from '../utils';


interface ComparisonViewProps {
  properties: Property[];
  valuations: Record<string, ComparisonValuationState>;
  onClose: () => void;
  onRemove: (property: Property) => void;
  onClear: () => void;
}

const ComparisonSkeleton: React.FC = () => (
    <div className="space-y-4 p-4 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-md"></div>
        <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
        <div className="h-6 bg-gray-200 rounded-md w-1/2"></div>
        <div className="space-y-2 pt-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
        </div>
    </div>
);

export const ComparisonView: React.FC<ComparisonViewProps> = ({ properties, valuations, onClose, onRemove, onClear }) => {
  const { settings, t } = useContext(SettingsContext);
  
  const renderRow = (titleKey: string, dataExtractor: (report: ValuationReport, prop: Property) => React.ReactNode | string | string[]) => {
    return (
      <tr>
        <td className="p-3 font-semibold text-gray-600 bg-gray-100 border-b border-r border-gray-200 sticky left-0">{t(titleKey)}</td>
        {properties.map(prop => {
          const valuationState = valuations[prop.id];
          return (
            <td key={prop.id} className="p-3 border-b border-gray-200 align-top">
              {valuationState?.report ? (
                Array.isArray(dataExtractor(valuationState.report, prop)) ? (
                  <ul className="list-disc list-inside space-y-1">
                    {(dataExtractor(valuationState.report, prop) as string[]).map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                ) : (
                  dataExtractor(valuationState.report, prop)
                )
              ) : null}
            </td>
          );
        })}
      </tr>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border-2 border-black"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{t('propertyComparisonReport')}</h2>
          <div className="flex items-center gap-2">
            <button 
                onClick={onClear} 
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-red-100 transition-colors"
            >
                <TrashIcon className="h-5 w-5" />
                {t('clearAll')}
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors">
                <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </header>
        
        <div className="flex-grow overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr>
                <th className="p-3 text-left font-semibold text-gray-600 bg-gray-100 border-b-2 border-gray-300 border-r border-gray-200 w-1/6 sticky left-0">{t('item')}</th>
                {properties.map(prop => {
                  const valuationState = valuations[prop.id];
                  const details = [
                      prop.district,
                      prop.type ? t(prop.type) : null,
                      prop.size ? `${(prop.size / 3.30579).toFixed(1)} ${t('pings')}` : null
                  ].filter(Boolean).join(' | ');

                  return (
                    <th key={prop.id} className="p-3 border-b-2 border-gray-300 w-1/4 relative">
                      <button 
                        onClick={() => onRemove(prop)}
                        className="absolute top-1 right-1 bg-white/50 rounded-full text-gray-500 hover:text-red-500 opacity-50 hover:opacity-100 transition-all"
                        title={t('remove')}
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                      {valuationState?.isLoading && <ComparisonSkeleton />}
                      {valuationState?.error && <div className="text-red-600 p-2 bg-red-50 rounded-md">{valuationState.error}</div>}
                      {valuationState?.report && (
                         <div className="text-left font-normal">
                           <img src={prop.imageUrl} alt={prop.address} className="h-24 w-full object-cover rounded-md mb-2"/>
                           <p className="font-semibold text-gray-800">{prop.address}</p>
                           <p className="text-xs text-gray-500">{details}</p>
                         </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {renderRow('estimatedTotalPrice', report => <span className="font-bold text-blue-600">{formatDisplayPrice(report.estimatedPrice, t, settings.language)}</span>)}
              {renderRow('unitPricePerPing', (report, prop) => {
                  const pings = report.inferredDetails?.sizePing ?? (prop.size ? prop.size / 3.30579 : 0);
                  const pricePerPingInWan = pings > 0 ? (report.estimatedPrice / pings) / 10000 : 0;
                  return formatUnitPrice(pricePerPingInWan, t, settings.language);
              })}
              {renderRow('confidenceIndex', report => report.confidence)}
              {renderRow('marketSummary', report => <p className="leading-relaxed">{report.marketSummary}</p>)}
              {renderRow('advantages', report => report.pros)}
              {renderRow('disadvantages', report => report.cons)}
              {renderRow('nearbySchools', report => report.amenitiesAnalysis.schools)}
              {renderRow('transportationConvenience', report => report.amenitiesAnalysis.transport)}
              {renderRow('shoppingAndGroceries', report => report.amenitiesAnalysis.shopping)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};