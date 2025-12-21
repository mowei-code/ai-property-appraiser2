
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  isFullScreen?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, className = '', isFullScreen = true }) => {
  const containerClasses = isFullScreen
    ? `fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 bg-black/5 cursor-wait text-center animate-fade-in ${className}`
    : `flex flex-col items-center justify-center p-8 bg-transparent min-h-[300px] text-center animate-fade-in ${className}`;

  return (
    <div className={containerClasses}>
      <div className="relative w-24 h-24 mb-6">
        {/* Outer slow spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 dark:border-slate-700/50"></div>
        <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin duration-[2s]"></div>

        {/* Inner fast spinning ring */}
        <div className="absolute inset-2 rounded-full border-4 border-indigo-500/20 dark:border-slate-800/30"></div>
        <div className="absolute inset-2 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin-reverse duration-[1.5s]"></div>

        {/* Pulsing center icon */}
        <div className="absolute inset-0 m-auto h-12 w-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/50 animate-pulse-slow">
          <SparklesIcon className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-3xl font-black text-white drop-shadow-lg">
          {message || '載入中...'}
        </h3>
        <p className="text-blue-100 font-medium max-w-xs animate-pulse">
          AI 正在進行智慧分析，請稍候片刻
        </p>
      </div>

      <style>{`
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
