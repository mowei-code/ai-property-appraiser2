
import React, { useContext, useRef } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { handlePrint } from '../utils';
import { ExportButton, ExportFormat } from './ExportButton';
import { APP_VERSION, APP_RELEASE_DATE } from '../constants';

interface InstructionManualProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionManual: React.FC<InstructionManualProps> = ({ isOpen, onClose }) => {
  const { t } = useContext(SettingsContext);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) {
    return null;
  }
  
  const generateContent = (format: 'txt' | 'md'): string => {
    const isMd = format === 'md';
    const h1 = isMd ? '# ' : '';
    const h2 = isMd ? '## ' : '\n';
    const h3 = isMd ? '### ' : '';
    const h4 = isMd ? '#### ' : '';
    const li = isMd ? '* ' : '- ';
    const b = isMd ? '**' : '';
    const p = isMd ? '' : '\n';
    const hr = isMd ? '\n---\n\n' : '\n========================================\n';

    let content = `${h1}${t('manualTitle')}\n\n`;
    content += `${h2}${t('manualIntroTitle')}\n${t('manualIntroBody')}\n\n`;
    content += `${isMd ? '> ' : ''}${b}${t('manualDisclaimer').replace(/<.*?>/g, '')}${b}\n\n`;
    content += `${h2}${t('manualGettingStartedTitle')}\n`;
    content += `${h4}${t('manualLoginTitle')}\n${t('manualLoginBody')}\n${p}`;
    content += `${h4}${t('manualApiKeyTitle')}\n${t('manualApiKeyBody1')}\n`;
    content += `${li}${t('manualApiKeyBody2')}\n`;
    content += `${li}${t('manualApiKeyBody3')}\n${p}`;
    content += `${h2}${t('manualMainFeaturesTitle')}\n`;
    content += `${h4}${t('manualValuationTitle')}\n${t('manualValuationBody1')}\n`;
    content += `${li}${b}${t('comprehensiveMarketFactors')}:${b} ${t('manualBasisDesc1')}\n`;
    content += `${li}${b}${t('actualTransactions')}:${b} ${t('manualBasisDesc2')}\n`;
    content += `${li}${b}${t('realtorPerspective')}:${b} ${t('manualBasisDesc3')}\n`;
    content += `${li}${b}${t('actualPingSize')}:${b} ${t('manualBasisDesc4')}\n`;
    content += `${li}${b}${t('regionalDevelopmentPotential')}:${b} ${t('manualBasisDesc5')}\n`;
    content += `${li}${b}${t('foreclosureInfo')}:${b} ${t('manualBasisDesc6')}\n`;
    content += `${li}${b}${t('rentalYieldAnalysis')}:${b} ${t('manualBasisDesc7')}\n`;
    content += `${li}${b}${t('bankAppraisalModel')}:${b} ${t('manualBasisDesc8')}\n${p}`;
    content += `${h4}${t('manualMapSearchTitle')}\n${t('manualMapSearchBody')}\n${p}`;
    content += `${h4}${t('manualReportFeatureTitle')}\n${t('manualReportFeatureBody')}\n${p}`;
    content += `${h4}${t('manualScenarioAnalysisTitle')}\n${t('manualScenarioAnalysisBody')}\n${p}`;
    content += `${h4}${t('manualComparisonTitle')}\n${t('manualComparisonBody')}\n${p}`;
    content += `${h2}${t('manualUserRolesTitle')}\n${t('manualUserRolesBody')}\n`;
    content += `${li}${b}${t('admin')}:${b} ${t('manualRoleAdminDesc')}\n`;
    content += `${li}${b}${t('paidUser')}:${b} ${t('manualRolePaidDesc')}\n`;
    content += `${li}${b}${t('generalUser')}:${b} ${t('manualRoleGeneralDesc')}\n`;
    
    return content;
  };

  const handleExport = (format: ExportFormat) => {
     if (format === 'pdf') {
      handlePrint('instruction-manual-content', t('manualTitle'));
      return;
    }

    const content = generateContent(format);
    const mimeType = format === 'md' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;';
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `${t('manualTitle')}.${format}`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 border-b-2 border-blue-500 pb-1">{title}</h3>
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
    </div>
  );

  return (
    <div
      id="instruction-manual-modal"
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="instruction-manual-title"
    >
        <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden border-2 border-black dark:border-gray-600"
            onClick={e => e.stopPropagation()}
        >
            <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 no-print">
              <h2 id="instruction-manual-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <BookOpenIcon className="h-6 w-6 text-blue-600" />
                {t('manualTitle')}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint('instruction-manual-content', t('manualTitle'))} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={t('printInstructions')}>
                    <PrinterIcon className="h-5 w-5 dark:text-gray-300" />
                </button>
                <ExportButton onExport={handleExport} />
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                  <XMarkIcon className="h-6 w-6 dark:text-gray-300" />
                </button>
              </div>
            </header>

            <main ref={contentRef} id="instruction-manual-content" className="p-6 overflow-y-auto printable-area">
                <div className="print-title">{t('manualTitle')}</div>
                <Section title={t('manualIntroTitle')}>
                    <p>{t('manualIntroBody')}</p>
                </Section>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 flex items-start gap-3 my-4">
                    <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: t('manualDisclaimer') }}></p>
                </div>

                <Section title={t('manualGettingStartedTitle')}>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('manualLoginTitle')}</h4>
                    <p>{t('manualLoginBody')}</p>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">{t('manualApiKeyTitle')}</h4>
                    <p>{t('manualApiKeyBody1')}</p>
                    <ul className="list-disc list-inside pl-4 mt-1">
                        <li>{t('manualApiKeyBody2')}</li>
                        <li>{t('manualApiKeyBody3')}</li>
                    </ul>
                </Section>

                <Section title={t('manualMainFeaturesTitle')}>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{t('manualValuationTitle')}</h4>
                    <p>{t('manualValuationBody1')}</p>
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                        <li><strong>{t('comprehensiveMarketFactors')}:</strong> {t('manualBasisDesc1')}</li>
                        <li><strong>{t('actualTransactions')}:</strong> {t('manualBasisDesc2')}</li>
                        <li><strong>{t('realtorPerspective')}:</strong> {t('manualBasisDesc3')}</li>
                        <li><strong>{t('actualPingSize')}:</strong> {t('manualBasisDesc4')}</li>
                        <li><strong>{t('regionalDevelopmentPotential')}:</strong> {t('manualBasisDesc5')}</li>
                        <li><strong>{t('foreclosureInfo')}:</strong> {t('manualBasisDesc6')}</li>
                        <li><strong>{t('rentalYieldAnalysis')}:</strong> {t('manualBasisDesc7')}</li>
                        <li><strong>{t('bankAppraisalModel')}:</strong> {t('manualBasisDesc8')}</li>
                    </ul>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">{t('manualMapSearchTitle')}</h4>
                    <p>{t('manualMapSearchBody')}</p>
                     <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">{t('manualReportFeatureTitle')}</h4>
                    <p>{t('manualReportFeatureBody')}</p>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">{t('manualScenarioAnalysisTitle')}</h4>
                    <p>{t('manualScenarioAnalysisBody')}</p>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mt-3">{t('manualComparisonTitle')}</h4>
                    <p>{t('manualComparisonBody')}</p>
                </Section>
                
                <Section title={t('manualUserRolesTitle')}>
                    <p>{t('manualUserRolesBody')}</p>
                     <ul className="list-disc list-inside pl-4 mt-1">
                        <li><strong>{t('admin')}:</strong> {t('manualRoleAdminDesc')}</li>
                        <li><strong>{t('paidUser')}:</strong> {t('manualRolePaidDesc')}</li>
                        <li><strong>{t('generalUser')}:</strong> {t('manualRoleGeneralDesc')}</li>
                    </ul>
                </Section>

                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-4 text-center text-xs text-gray-400">
                    <p>{t('appTitle')} {APP_VERSION}</p>
                    <p>{t('releaseDate')}: {APP_RELEASE_DATE}</p>
                </div>
            </main>
        </div>
    </div>
  );
};
