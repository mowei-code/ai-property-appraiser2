
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  isFullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, className = '', isFullScreen = true }) => {
  const { t } = useTranslation();

  const containerClasses = isFullScreen
    ? `fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-transparent cursor-wait text-center animate-fade-in ${className}`
    : `flex flex-col items-center justify-center p-8 bg-transparent min-h-[300px] text-center animate-fade-in ${className}`;

  return (
    <div className={containerClasses}>
      <div className="relative w-24 h-24 mb-6">
        {/* Outer slow spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-600/30 dark:border-blue-400/30"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-700 dark:border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin duration-[2s]"></div>

        {/* Inner fast spinning ring */}
        <div className="absolute inset-2 rounded-full border-4 border-indigo-600/30 dark:border-indigo-400/30"></div>
        <div className="absolute inset-2 rounded-full border-4 border-t-indigo-700 dark:border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin-reverse duration-[1.5s]"></div>

        {/* Pulsing center icon */}
        <div className="absolute inset-0 m-auto h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 animate-pulse-slow">
          <SparklesIcon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="space-y-3">
        {/* High contrast text with white glow for readability on any background */}
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-wide text-glow">
          {message || t('valuating')}
        </h3>
        <p className="text-blue-800 dark:text-blue-200 font-bold text-lg max-w-xs animate-pulse text-glow">
          {t('aiAnalysisInProgress')}
        </p>
      </div>

      <style>{`
        .text-glow {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 2px rgba(255, 255, 255, 1);
        }
        :global(.dark) .text-glow {
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 1);
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s infinite ease-in-out;
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
};
