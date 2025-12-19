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

  const renderDesktopRow = (titleKey: string, dataExtractor: (report: ValuationReport, prop: Property) => React.ReactNode | string | string[]) => {
    return (
      <tr className="group">
        <td className="p-4 font-semibold text-gray-700 bg-gray-50/80 dark:bg-slate-800/80 border-b border-r border-gray-200 dark:border-slate-700 sticky left-0 z-20 backdrop-blur-sm">
          {t(titleKey)}
        </td>
        {properties.map(prop => {
          const valuationState = valuations[prop.id];
          return (
            <td key={prop.id} className="p-4 border-b border-gray-200 dark:border-slate-700 align-top dark:text-slate-300">
              {valuationState?.report ? (
                Array.isArray(dataExtractor(valuationState.report, prop)) ? (
                  <ul className="list-disc list-inside space-y-1.5">
                    {(dataExtractor(valuationState.report, prop) as string[]).map((item, index) => (
                      <li key={index} className="text-gray-700 dark:text-slate-300 leading-relaxed">{item}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="leading-relaxed">{dataExtractor(valuationState.report, prop)}</div>
                )
              ) : valuationState?.isLoading ? (
                <div className="h-4 bg-gray-100 dark:bg-slate-700 animate-pulse rounded w-3/4"></div>
              ) : null}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 sm:rounded-2xl shadow-2xl w-full max-w-7xl h-full sm:h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border-0 sm:border dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex-shrink-0 z-50">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              {t('propertyComparisonReport')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Comparing {properties.length} properties
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95"
            >
              <TrashIcon className="h-5 w-5" />
              <span className="hidden sm:inline">{t('clearAll')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-grow overflow-auto bg-slate-50 dark:bg-slate-950">

          {/* Desktop Table: Hidden on small screens */}
          <div className="hidden lg:block min-w-full">
            <table className="w-full text-sm border-collapse bg-white dark:bg-slate-900">
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-white dark:bg-slate-900">
                  <th className="p-4 text-left font-bold text-gray-800 dark:text-slate-100 bg-gray-50 dark:bg-slate-800 border-b-2 border-gray-200 dark:border-slate-700 border-r w-48 sticky left-0 z-40 backdrop-blur-sm">
                    {t('item')}
                  </th>
                  {properties.map(prop => {
                    const valuationState = valuations[prop.id];
                    const details = [
                      prop.district,
                      prop.type ? t(prop.type) : null,
                      prop.size ? `${(prop.size / 3.30579).toFixed(1)} ${t('pings')}` : null
                    ].filter(Boolean).join(' | ');

                    return (
                      <th key={prop.id} className="p-4 border-b-2 border-gray-200 dark:border-slate-700 min-w-[280px] relative transition-colors bg-white dark:bg-slate-900 group">
                        <button
                          onClick={() => onRemove(prop)}
                          className="absolute top-2 right-2 p-1.5 bg-gray-100 dark:bg-slate-800 text-gray-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                          title={t('remove')}
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>

                        {valuationState?.isLoading && <ComparisonSkeleton />}
                        {valuationState?.error && (
                          <div className="text-red-500 p-4 bg-red-50/50 dark:bg-red-900/10 rounded-xl text-center border border-red-100 dark:border-red-900/30">
                            {valuationState.error}
                          </div>
                        )}

                        {valuationState?.report && (
                          <div className="text-left font-normal animate-fade-in">
                            <div className="relative h-32 w-full overflow-hidden rounded-xl mb-3 shadow-md group-hover:shadow-lg transition-shadow">
                              <img src={prop.imageUrl} alt={prop.address} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-x-0 bottom-0 bg-black/40 p-2 backdrop-blur-sm">
                                <p className="text-[10px] text-white/90 truncate uppercase tracking-widest">{prop.district}</p>
                              </div>
                            </div>
                            <h4 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight mb-1 line-clamp-2">{prop.address}</h4>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{details}</p>
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {renderDesktopRow('estimatedTotalPrice', report => (
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 drop-shadow-sm">
                    {formatDisplayPrice(report.estimatedPrice, t, settings.language)}
                  </span>
                ))}
                {renderDesktopRow('unitPricePerPing', (report, prop) => {
                  const pings = report.inferredDetails?.sizePing ?? (prop.size ? prop.size / 3.30579 : 0);
                  const pricePerPingInWan = pings > 0 ? (report.estimatedPrice / pings) / 10000 : 0;
                  return (
                    <div className="font-bold text-gray-700 dark:text-slate-200">
                      {formatUnitPrice(pricePerPingInWan, t, settings.language)}
                    </div>
                  );
                })}
                {renderDesktopRow('confidenceIndex', report => (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">{report.confidence}</span>
                  </div>
                ))}
                {renderDesktopRow('marketSummary', report => <p className="text-gray-600 dark:text-slate-400">{report.marketSummary}</p>)}
                {renderDesktopRow('advantages', report => report.pros)}
                {renderDesktopRow('disadvantages', report => report.cons)}
                {renderRowDetailedDesktop('amenities', (report) => (
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100/50 dark:border-green-900/20">
                      <span className="text-[10px] uppercase font-bold text-green-700 dark:text-green-400 block mb-1">{t('nearbySchools')}</span>
                      <p className="text-xs text-green-800 dark:text-green-300">{report.amenitiesAnalysis.schools}</p>
                    </div>
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                      <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block mb-1">{t('transportationConvenience')}</span>
                      <p className="text-xs text-blue-800 dark:text-blue-300">{report.amenitiesAnalysis.transport}</p>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100/50 dark:border-amber-900/20">
                      <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block mb-1">{t('shoppingAndGroceries')}</span>
                      <p className="text-xs text-amber-800 dark:text-amber-300">{report.amenitiesAnalysis.shopping}</p>
                    </div>
                  </div>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout: Hidden on large screens */}
          <div className="lg:hidden p-4 space-y-6">
            {properties.map((prop, idx) => {
              const valuationState = valuations[prop.id];
              const pings = valuationState?.report?.inferredDetails?.sizePing ?? (prop.size ? prop.size / 3.30579 : 0);
              const pricePerPingInWan = pings > 0 && valuationState?.report ? (valuationState.report.estimatedPrice / pings) / 10000 : 0;

              return (
                <div key={prop.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  {/* Card Header with Image */}
                  <div className="relative h-48 sm:h-64">
                    <img src={prop.imageUrl} alt={prop.address} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <button
                      onClick={() => onRemove(prop)}
                      className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-red-500 backdrop-blur-md rounded-full text-white transition-all shadow-lg"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{prop.district} | {t(prop.type || '')}</p>
                      <h3 className="text-lg font-bold text-white leading-tight">{prop.address}</h3>
                    </div>
                  </div>

                  {/* Pricing Overview */}
                  <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-slate-800 border-b border-gray-100 dark:border-slate-800">
                    <div className="p-4 text-center">
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-bold mb-1">{t('estimatedTotalPrice')}</p>
                      <p className="text-xl font-black text-blue-600 dark:text-blue-400">
                        {valuationState?.report ? formatDisplayPrice(valuationState.report.estimatedPrice, t, settings.language) : '---'}
                      </p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase font-bold mb-1">{t('unitPricePerPing')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {valuationState?.report ? formatUnitPrice(pricePerPingInWan, t, settings.language) : '---'}
                      </p>
                    </div>
                  </div>

                  {/* Details - Collapsible content style */}
                  <div className="p-5 space-y-6">
                    {valuationState?.isLoading && (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-4/6"></div>
                      </div>
                    )}

                    {valuationState?.error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                        {valuationState.error}
                      </div>
                    )}

                    {valuationState?.report && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Market Summary */}
                        <section>
                          <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            {t('marketSummary')}
                          </h5>
                          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-normal">
                            {valuationState.report.marketSummary}
                          </p>
                        </section>

                        {/* Pros & Cons */}
                        <div className="grid grid-cols-1 gap-4">
                          <section className="bg-green-50/30 dark:bg-green-900/5 p-4 rounded-2xl border border-green-100/50 dark:border-green-900/10">
                            <h5 className="text-[11px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">{t('advantages')}</h5>
                            <ul className="space-y-2">
                              {valuationState.report.pros.map((p, i) => (
                                <li key={i} className="text-sm text-green-800 dark:text-green-300 flex gap-2">
                                  <span className="text-green-500">•</span> {p}
                                </li>
                              ))}
                            </ul>
                          </section>
                          <section className="bg-red-50/30 dark:bg-red-900/5 p-4 rounded-2xl border border-red-100/50 dark:border-red-900/10">
                            <h5 className="text-[11px] font-black text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">{t('disadvantages')}</h5>
                            <ul className="space-y-2">
                              {valuationState.report.cons.map((c, i) => (
                                <li key={i} className="text-sm text-red-800 dark:text-red-300 flex gap-2">
                                  <span className="text-red-500">•</span> {c}
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>

                        {/* Amenities */}
                        <section className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                          <h5 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 text-center">{t('amenities')}</h5>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">{t('nearbySchools')}</p>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{valuationState.report.amenitiesAnalysis.schools}</p>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">{t('transportationConvenience')}</p>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{valuationState.report.amenitiesAnalysis.transport}</p>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">{t('shoppingAndGroceries')}</p>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{valuationState.report.amenitiesAnalysis.shopping}</p>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  function renderRowDetailedDesktop(titleKey: string, contentMapper: (report: ValuationReport) => React.ReactNode) {
    return (
      <tr className="group">
        <td className="p-4 font-semibold text-gray-700 bg-gray-50/80 dark:bg-slate-800/80 border-b border-r border-gray-200 dark:border-slate-700 sticky left-0 z-20 backdrop-blur-sm">
          {t(titleKey)}
        </td>
        {properties.map(prop => {
          const val = valuations[prop.id];
          return (
            <td key={prop.id} className="p-4 border-b border-gray-200 dark:border-slate-700 align-top">
              {val?.report ? contentMapper(val.report) : null}
            </td>
          );
        })}
      </tr>
    );
  }
};