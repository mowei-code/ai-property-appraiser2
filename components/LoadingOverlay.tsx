
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  isFullScreen?: boolean;
  type?: 'loading' | 'success';
}

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, className = '', isFullScreen = true, type = 'loading' }) => {
  const { t } = useTranslation();

  const containerClasses = isFullScreen
    ? `fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-sm cursor-wait text-center animate-fade-in ${className}`
    : `flex flex-col items-center justify-center p-8 bg-transparent min-h-[300px] text-center animate-fade-in ${className}`;

  if (type === 'success') {
    return (
      <div className={containerClasses}>
        <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-green-200 dark:border-green-900 flex flex-col items-center gap-6 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircleIcon className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {message || t('success')}
            </h3>
            <div className="w-12 h-1 bg-green-500 mx-auto rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

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
