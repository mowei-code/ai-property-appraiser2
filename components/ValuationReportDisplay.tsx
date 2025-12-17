
import React, { useState, useContext } from 'react';
import type { Property, ValuationReport, RealtorInfo, User, ForeclosureInfo, RentalInfo } from '../types';
import { getScenarioAnalysis } from '../services/geminiService';
import { SettingsContext } from '../contexts/SettingsContext';
import { StarIconOutline } from './icons/StarIconOutline';
import { StarIconSolid } from './icons/StarIconSolid';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { ArrowTrendingDownIcon } from './icons/ArrowTrendingDownIcon';
import { MinusSmallIcon } from './icons/MinusSmallIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { TruckIcon } from './icons/TruckIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { MortgageCalculator } from './MortgageCalculator';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { ExportButton, ExportFormat } from './ExportButton';
import { formatDisplayPrice, formatUnitPrice, handlePrint } from '../utils';
import { ScaleIcon } from './icons/ScaleIcon';
import { BuildingLibraryIcon } from './icons/BuildingLibraryIcon';


interface ValuationReportDisplayProps {
  property: Property;
  valuation: ValuationReport | null;
  isLoading: boolean;
  error: string | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isValuating: boolean;
  onOpenHistory: () => void;
  currentUser: User | null;
  onOpenSettings: () => void;
  loadingMessage: string;
}

const ConfidenceIndicator: React.FC<{ confidence: string; t: (key: string) => string }> = ({ confidence, t }) => {
  let colorClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200';
  let level = '中';
  let trendIcon = <MinusSmallIcon className="h-4 w-4" />;

  const lowerConf = confidence.toLowerCase();
  if (lowerConf.includes('高') || lowerConf.includes('high')) {
    colorClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    level = '高';
    trendIcon = <ArrowTrendingUpIcon className="h-4 w-4" />;
  } else if (lowerConf.includes('低') || lowerConf.includes('low')) {
    colorClass = 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    level = '低';
    trendIcon = <ArrowTrendingDownIcon className="h-4 w-4" />;
  }
  return (
    <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${colorClass}`}>
      {trendIcon}
      <span>{t('confidencePrefix')}: {level}</span>
    </div>
  );
};

const RealtorAnalysisDisplay: React.FC<{ analysis: RealtorInfo[]; t: (key: string) => string }> = ({ analysis, t }) => {
    return (
        <div className="mt-8">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                {t('localRealtorPerspective')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-slate-900 dark:text-white">{item.realtorName}</p>
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400">{item.branchName}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {item.address}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.analysis}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ForeclosureAnalysisDisplay: React.FC<{ analysis: NonNullable<ValuationReport['foreclosureAnalysis']>; t: (key: string) => string }> = ({ analysis, t }) => {
    return (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <ScaleIcon className="h-5 w-5 text-blue-600" />
                {t('nearbyForeclosureAnalysis')}
            </h4>
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">{analysis.summary}</p>
                {analysis.cases && analysis.cases.length > 0 && (
                    <div className="space-y-3">
                        {analysis.cases.map((item, index) => (
                            <div key={index} className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
                                <p className="font-bold text-sm text-slate-900 dark:text-white flex justify-between">
                                    {item.address}
                                    <span className="text-amber-600 dark:text-amber-400 font-normal text-xs bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded">{t('estimatedAuctionPrice')}: {item.auctionPrice}</span>
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{item.analysis}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RentalYieldAnalysisDisplay: React.FC<{ analysis: NonNullable<ValuationReport['rentalYieldAnalysisData']>; t: (key: string) => string }> = ({ analysis, t }) => {
    return (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
                {t('nearbyRentalAnalysis')}
            </h4>
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-4">{analysis.summary}</p>
                {analysis.listings && analysis.listings.length > 0 && (
                     <div className="overflow-hidden rounded-xl border border-indigo-100 dark:border-indigo-800/30 bg-white dark:bg-slate-800">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-indigo-50 dark:bg-indigo-900/20">
                                <tr>
                                    <th className="p-3 font-medium text-indigo-700 dark:text-indigo-300">{t('rentalAddress')}</th>
                                    <th className="p-3 font-medium text-indigo-700 dark:text-indigo-300">{t('rentalMonthlyRent')}</th>
                                    <th className="p-3 font-medium text-indigo-700 dark:text-indigo-300">{t('rentalSource')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-indigo-50 dark:divide-indigo-800/30">
                                {analysis.listings.map((item, index) => (
                                    <tr key={index} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                        <td className="p-3 text-slate-700 dark:text-slate-300">{item.address}</td>
                                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{item.monthlyRent}</td>
                                        <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{item.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


interface ScenarioAnalysisProps {
  property: Property;
  valuation: ValuationReport;
  currentUser: User | null;
  onOpenSettings: () => void;
}

const ScenarioAnalysis: React.FC<ScenarioAnalysisProps> = ({ property, valuation, currentUser, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const { settings, getApiKey, t } = useContext(SettingsContext);

  const userHasPermission = currentUser?.role === '管理員' || currentUser?.role === '付費用戶';

  const handleAnalysis = async () => {
    if (!query.trim()) {
      setAnalysisError(t('errorEnterScenario'));
      return;
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      setAnalysisError(t('apiKeyWarning'));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult('');
    try {
      const result = await getScenarioAnalysis(property, valuation, query, apiKey, settings.language);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '分析時發生未知錯誤。');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleExportScenario = (format: ExportFormat) => {
    if (!analysisResult) return;
    const { address } = property;
    const filenameSafeAddress = address.replace(/[\/\\?%*:|"<>]/g, '-');
    const filename = `${t('aiScenarioAnalysis')}_${filenameSafeAddress}`;

    if (format === 'pdf') {
        handlePrint('scenario-analysis-section', `${t('aiScenarioAnalysis')} - ${property.address}`);
        return;
    }

    let content = '';
    const extension = format;
    const mimeType = format === 'md' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;';

    const title = `${t('aiScenarioAnalysis')} - ${address}`;

    if (format === 'md') {
        content += `# ${title}\n\n`;
        content += `**${t('scenarioAnalysisPrompt').split(" ")[0]}**: "${query}"\n\n`;
        content += `## AI ${t('analyzing')}:\n${analysisResult}\n`;
    } else {
        content += `${title}\n`;
        content += "========================================\n\n";
        content += `${t('scenarioAnalysisPrompt').split(" ")[0]} "${query}"\n\n`;
        content += `AI ${t('analyzing')}:\n${analysisResult}\n`;
    }

    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="scenario-analysis-section" className="mt-8 pt-8 border-t border-dashed border-slate-300 dark:border-slate-700">
      <div className="print-title">{t('aiScenarioAnalysis')}</div>
      <div className="print-subtitle">{property.address}</div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500">
            {t('aiScenarioAnalysis')}
          </span>
        </h4>
        {analysisResult && (
            <div className="flex items-center gap-2 no-print">
                <button 
                    onClick={() => handlePrint('scenario-analysis-section', `${t('aiScenarioAnalysis')} - ${property.address}`)} 
                    className="p-2 text-slate-500 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={t('printReport')}
                >
                    <PrinterIcon className="h-5 w-5" />
                </button>
                <ExportButton onExport={handleExportScenario} />
            </div>
        )}
      </div>
      
      <div className="no-print bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          {userHasPermission ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 font-medium">
              {t('scenarioAnalysisPrompt')}
            </p>
          ) : (
             <div className="text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 p-3 rounded-lg border border-amber-200 dark:border-amber-700 mb-3" role="alert">
                {t('premiumFeatureOnly')}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={userHasPermission ? t('enterScenarioPlaceholder') : t('enterScenarioPlaceholderDisabled')}
              className="flex-grow p-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[50px] sm:min-h-0 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-shadow"
              rows={1}
              disabled={!userHasPermission || isAnalyzing}
            />
            <button
              onClick={handleAnalysis}
              disabled={!userHasPermission || isAnalyzing}
              className="flex-shrink-0 flex justify-center items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:bg-none disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
            >
              {isAnalyzing ? (
                <>
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('analyzing')}</span>
                </>
              ) : (
                 <>
                  <SparklesIcon className="h-5 w-5" />
                  <span>{t('runAnalysis')}</span>
                </>
              )}
            </button>
          </div>
          {analysisError && (
            <div className={`mt-3 p-3 rounded-lg border text-sm ${analysisError === t('apiKeyWarning') ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-700' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-700'}`}>
                <div className="flex justify-between items-center">
                    <span>{analysisError}</span>
                    {analysisError === t('apiKeyWarning') && (
                        <button 
                            onClick={onOpenSettings} 
                            className="text-amber-700 dark:text-amber-400 font-bold underline ml-2 hover:text-amber-900 dark:hover:text-amber-200"
                        >
                            {t('settings')}
                        </button>
                    )}
                </div>
            </div>
          )}
      </div>

      {analysisResult && (
        <div className="mt-4 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/50 animate-fade-in">
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed text-base">{analysisResult}</p>
            </div>
        </div>
      )}
    </div>
  );
};


export const ValuationReportDisplay: React.FC<ValuationReportDisplayProps> = ({
  property,
  valuation,
  isLoading,
  error,
  isFavorite,
  onToggleFavorite,
  isValuating,
  onOpenHistory,
  currentUser,
  onOpenSettings,
  loadingMessage,
}) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const { settings, t } = useContext(SettingsContext);
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };
  
  const pings = valuation?.inferredDetails?.sizePing ?? (property.size ? property.size / 3.30579 : 0);

  const displayDetails = {
      district: property.district,
      type: valuation?.inferredDetails?.type ?? property.type,
      floor: valuation?.inferredDetails?.floor ?? property.floor,
      size: pings > 0 ? `${pings.toFixed(1)} ${t('pings')}` : null,
  };

  const detailsString = [
      displayDetails.district,
      displayDetails.type ? t(displayDetails.type as any) : null,
      displayDetails.floor,
      displayDetails.size
  ].filter(Boolean).join(' • ');

  const handleExportComprehensive = (format: ExportFormat) => {
    if (!valuation) return;

    const { address } = property;
    const filenameSafeAddress = address.replace(/[\/\\?%*:|"<>]/g, '-');
    const filename = `${t('aiComprehensiveAnalysis')}_${filenameSafeAddress}`;

    if (format === 'pdf') {
        handlePrint('comprehensive-analysis-section', `${t('aiComprehensiveAnalysis')} - ${property.address}`);
        return;
    }
    
    const pricePerPingInWan = pings > 0 ? (valuation.estimatedPrice / pings) / 10000 : 0;
    const title = `${t('aiComprehensiveAnalysis')} - ${address}`;
    let content = '';
    const extension = format;
    const mimeType = format === 'md' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;';
    
    if (format === 'md') {
        content += `# ${title}\n\n`;
        content += `**${t('aiEstimatedPrice')}**: ${formatDisplayPrice(valuation.estimatedPrice, t, settings.language)}\n`;
        content += `**${t('pricePerPing')}**: ${formatUnitPrice(pricePerPingInWan, t, settings.language)}\n`;
        content += `**${t('confidencePrefix')}**: ${valuation.confidence}\n\n`;
        content += `## ${t('marketSummary')}\n${valuation.marketSummary}\n\n`;
        content += `## ${t('advantagesAnalysis')}\n${valuation.pros.map(p => `* ${p}`).join('\n')}\n\n`;
        content += `## ${t('disadvantagesAnalysis')}\n${valuation.cons.map(c => `* ${c}`).join('\n')}\n\n`;
        content += `## ${t('amenitiesAnalysis')}\n`;
        content += `* **${t('nearbySchools')}**: ${valuation.amenitiesAnalysis.schools}\n`;
        content += `* **${t('transportationConvenience')}**: ${valuation.amenitiesAnalysis.transport}\n`;
        content += `* **${t('shoppingAndGroceries')}**: ${valuation.amenitiesAnalysis.shopping}\n`;
        if (valuation.realtorAnalysis && valuation.realtorAnalysis.length > 0) {
            content += `\n## ${t('localRealtorPerspective')}\n`;
            valuation.realtorAnalysis.forEach(item => {
                content += `\n### ${item.realtorName} (${item.branchName})\n\n${item.analysis}\n`;
            });
        }
    } else { // txt format
        content += `${title}\n`;
        content += "========================================\n\n";
        content += `${t('aiEstimatedPrice')}: ${formatDisplayPrice(valuation.estimatedPrice, t, settings.language)}\n`;
        content += `${t('pricePerPing')}: ${formatUnitPrice(pricePerPingInWan, t, settings.language)}\n`;
        content += `${t('confidencePrefix')}: ${valuation.confidence}\n\n`;
        content += `${t('marketSummary')}:\n${valuation.marketSummary}\n\n`;
        content += `${t('advantagesAnalysis')}:\n${valuation.pros.map(p => `- ${p}`).join('\n')}\n\n`;
        content += `${t('disadvantagesAnalysis')}:\n${valuation.cons.map(c => `- ${c}`).join('\n')}\n\n`;
        content += `${t('amenitiesAnalysis')}:\n`;
        content += `  - ${t('nearbySchools')}: ${valuation.amenitiesAnalysis.schools}\n`;
        content += `  - ${t('transportationConvenience')}: ${valuation.amenitiesAnalysis.transport}\n`;
        content += `  - ${t('shoppingAndGroceries')}: ${valuation.amenitiesAnalysis.shopping}\n`;
        if (valuation.realtorAnalysis && valuation.realtorAnalysis.length > 0) {
            content += `\n${t('localRealtorPerspective')}:\n`;
            valuation.realtorAnalysis.forEach(item => {
                content += `\n- ${item.realtorName} (${item.branchName}):\n  ${item.analysis}\n`;
            });
        }
    }
    
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.${extension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || isValuating) {
    return (
      <div className="mt-6 p-8 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 min-h-[300px] text-center animate-pulse">
        <div className="relative w-20 h-20 mb-6">
             <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-slate-700"></div>
             <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
             <SparklesIcon className="absolute inset-0 m-auto h-8 w-8 text-blue-500 animate-bounce" />
        </div>
        <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('valuating')}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs">{loadingMessage || t('valuating_init')}</p>
      </div>
    );
  }

  if (error) {
    const isApiKeyError = error === t('apiKeyWarning') || error === t('adminApiKeySetupRequired');
    
    if (isApiKeyError) {
       return (
        <div className="mt-6 p-6 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-3xl border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-center gap-4 animate-fade-in text-center sm:text-left">
            <div className="bg-amber-100 dark:bg-amber-800 p-3 rounded-full flex-shrink-0">
                <SparklesIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-lg mb-1">{error}</h3>
                <p className="text-sm opacity-90">{t('apiKeySetupPrompt')}</p>
            </div>
            <button 
                onClick={onOpenSettings}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
                {t('settings')}
            </button>
        </div>
       );
    }

    return (
        <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-3xl border border-red-200 dark:border-red-800 flex items-start gap-3">
            <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full flex-shrink-0">
                <MinusSmallIcon className="h-6 w-6" />
            </div>
            <div className="mt-1">{error}</div>
        </div>
    );
  }
  
  if (!valuation) {
    return (
       <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-800 dark:text-blue-200 rounded-3xl border border-blue-100 dark:border-blue-800/50">
            <div className="flex flex-wrap justify-center sm:justify-between items-center gap-x-6 gap-y-4">
              <div className="text-center sm:text-left">
                <p className="font-medium">{t('startValuationPrompt')}</p>
                <p className="text-sm mt-1 opacity-80">{t('apiKeySetupPrompt')}</p>
              </div>
              {currentUser?.role === '一般用戶' && (
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-1.5">{t('unlockAdvancedFeatures')}</p>
                  <button
                    onClick={onOpenSettings}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full shadow-md shadow-amber-500/30 transition-all hover:-translate-y-0.5 text-sm flex items-center gap-1 mx-auto"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    {t('upgradeToPaid')}
                  </button>
                </div>
              )}
            </div>
       </div>
    );
  }
  
  const pricePerPingInWan = pings > 0 ? (valuation.estimatedPrice / pings) / 10000 : 0;

  return (
    <div className="mt-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex-grow">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                <BuildingLibraryIcon className="h-4 w-4" />
                {detailsString}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{property.address}</h2>
        </div>
        <div className="flex items-center gap-2 self-end no-print">
            <button
                onClick={handleFavoriteClick}
                className="group p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:border-yellow-400 transition-all shadow-sm"
                title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
            >
                {isFavorite ? (
                    <StarIconSolid className="h-6 w-6 text-yellow-400 scale-110" />
                ) : (
                    <StarIconOutline className="h-6 w-6 text-slate-400 group-hover:text-yellow-500 transition-colors" />
                )}
            </button>
             <button
                onClick={onOpenHistory}
                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 text-slate-500 dark:text-slate-400 transition-all shadow-sm"
                title={t('viewValuationHistory')}
            >
                <DocumentTextIcon className="h-6 w-6" />
            </button>
        </div>
      </div>

      {/* Hero Price Card */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
         <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('aiEstimatedPrice')}</span>
                    <ConfidenceIndicator confidence={valuation.confidence} t={t} />
                </div>
                <p className="text-5xl sm:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
                    {formatDisplayPrice(valuation.estimatedPrice, t, settings.language)}
                </p>
                 <div className="mt-3 inline-flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t('pricePerPing')}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatUnitPrice(pricePerPingInWan, t, settings.language)}</span>
                </div>
            </div>

            <div className="flex-shrink-0 no-print">
                 <button 
                    onClick={() => setIsCalculatorOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-semibold rounded-2xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
                >
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                        <CalculatorIcon className="h-5 w-5" />
                    </div>
                    <span>{t('calculateMortgage')}</span>
                </button>
            </div>
        </div>
      </div>

      {/* Comprehensive Analysis Section */}
      <div id="comprehensive-analysis-section" className="mt-8">
        <div className="print-title">{t('aiComprehensiveAnalysis')}</div>
        <div className="print-subtitle">{property.address}</div>
        
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <span className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                    <SparklesIcon className="h-6 w-6" />
                 </span>
                {t('aiComprehensiveAnalysis')}
            </h3>
            <div className="flex items-center gap-2 no-print">
                <button 
                    onClick={() => handlePrint('comprehensive-analysis-section', `${t('aiComprehensiveAnalysis')} - ${property.address}`)} 
                    className="p-2 text-slate-500 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={t('printReport')}
                >
                    <PrinterIcon className="h-5 w-5" />
                </button>
                <ExportButton onExport={handleExportComprehensive} />
            </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <p className="text-slate-700 dark:text-slate-300 leading-loose text-lg">{valuation.marketSummary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pros Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 mb-4 text-lg">
                    <div className="p-1.5 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                        <ArrowTrendingUpIcon className="h-5 w-5" />
                    </div>
                    {t('advantagesAnalysis')}
                </h4>
                <ul className="space-y-3">
                {valuation.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-2 text-emerald-900 dark:text-emerald-100">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span>{pro}</span>
                    </li>
                ))}
                </ul>
            </div>

             {/* Cons Card */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-800/30">
                <h4 className="font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2 mb-4 text-lg">
                     <div className="p-1.5 bg-rose-200 dark:bg-rose-800 rounded-lg">
                        <ArrowTrendingDownIcon className="h-5 w-5" />
                    </div>
                    {t('disadvantagesAnalysis')}
                </h4>
                <ul className="space-y-3">
                {valuation.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-2 text-rose-900 dark:text-rose-100">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                        <span>{con}</span>
                    </li>
                ))}
                </ul>
            </div>
        </div>
        
        {/* Amenities Grid */}
        <div className="mt-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-5">
                <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                {t('amenitiesAnalysis')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-xl text-blue-600 dark:text-blue-300"><AcademicCapIcon className="h-5 w-5"/></div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t('nearbySchools')}</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{valuation.amenitiesAnalysis.schools}</p>
                </div>
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-xl text-purple-600 dark:text-purple-300"><TruckIcon className="h-5 w-5"/></div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t('transportationConvenience')}</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{valuation.amenitiesAnalysis.transport}</p>
                </div>
                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-xl text-orange-600 dark:text-orange-300"><ShoppingCartIcon className="h-5 w-5"/></div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{t('shoppingAndGroceries')}</p>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{valuation.amenitiesAnalysis.shopping}</p>
                </div>
            </div>
        </div>
        
        {valuation.realtorAnalysis && valuation.realtorAnalysis.length > 0 && (
            <RealtorAnalysisDisplay analysis={valuation.realtorAnalysis} t={t} />
        )}

        {valuation.foreclosureAnalysis && (
            <ForeclosureAnalysisDisplay analysis={valuation.foreclosureAnalysis} t={t} />
        )}

        {valuation.rentalYieldAnalysisData && (
            <RentalYieldAnalysisDisplay analysis={valuation.rentalYieldAnalysisData} t={t} />
        )}
      </div>
      
      <ScenarioAnalysis property={property} valuation={valuation} currentUser={currentUser} onOpenSettings={onOpenSettings} />

      {isCalculatorOpen && (
          <MortgageCalculator
              estimatedPrice={valuation.estimatedPrice}
              isOpen={isCalculatorOpen}
              onClose={() => setIsCalculatorOpen(false)}
          />
      )}
    </div>
  );
};
