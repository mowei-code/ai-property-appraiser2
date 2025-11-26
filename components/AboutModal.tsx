
import React, { useContext } from 'react';
import { XMarkIcon } from './icons/XMarkIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { SettingsContext } from '../contexts/SettingsContext';
import { APP_VERSION, APP_RELEASE_DATE } from '../constants';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useContext(SettingsContext);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden border-2 border-black dark:border-gray-600"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 id="about-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            {t('about')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={t('close')}>
            <XMarkIcon className="h-6 w-6 dark:text-gray-300" />
          </button>
        </header>

        <main className="p-6 overflow-y-auto text-gray-700 dark:text-gray-300 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('developer')}</h3>
                <p className="text-lg font-bold">Mazylab</p>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('version')}</h3>
                <p>{APP_VERSION}</p>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('releaseDate')}</h3>
                <p>{APP_RELEASE_DATE}</p>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('contactEmail')}</h3>
                <a href="mailto:twmazy@gmail.com" className="text-blue-600 hover:underline">twmazy@gmail.com</a>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('references')}</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                    <li>{t('dataSourceMoi')}</li>
                    <li>Google Gemini API</li>
                    <li>OpenStreetMap / Nominatim</li>
                </ul>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-500 text-center">
                <p>{t('rightsReserved')}</p>
                <p>&copy; Mazylab 2025</p>
            </div>
        </main>
      </div>
    </div>
  );
};
