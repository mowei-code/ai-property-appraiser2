import React, { useState, useRef, useEffect, useContext } from 'react';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { SettingsContext } from '../contexts/SettingsContext';

export type ExportFormat = 'txt' | 'md' | 'pdf';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useContext(SettingsContext);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExportClick = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title={t('exportReport')}
        >
          <DocumentArrowDownIcon className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-opacity-5 focus:outline-none z-10 border border-gray-200 dark:border-gray-700">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <a href="#" onClick={(e) => { e.preventDefault(); handleExportClick('txt'); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
              {t('exportAsTxt')} (.txt)
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleExportClick('md'); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
              {t('exportAsMarkdown')} (.md)
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); handleExportClick('pdf'); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" role="menuitem">
              {t('exportAsPdf')} (.pdf)
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
