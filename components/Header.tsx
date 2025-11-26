
import React, { useContext } from 'react';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ArrowLeftOnRectangleIcon } from './icons/ArrowLeftOnRectangleIcon';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { currentUser, logout, setLoginModalOpen, setAdminPanelOpen } = useContext(AuthContext);
  const { setSettingsModalOpen, t } = useContext(SettingsContext);

  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-slate-200/40 dark:shadow-slate-900/40 border border-orange-200 dark:border-orange-800 rounded-[2rem] px-6 py-3 flex items-center justify-between transition-all duration-300 ${className}`}>
        {/* Logo Area */}
        <div className="flex items-center gap-3 group cursor-pointer select-none">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/30 transition-transform duration-300 ease-in-out group-hover:rotate-[-12deg] group-hover:scale-110">
            <BuildingOfficeIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">
            {t('appTitle')}
          </h1>
        </div>

        {/* Right Actions Area */}
        <div>
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User Info (Hidden on mobile) */}
              <span className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                <UserCircleIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                    {currentUser.name || currentUser.email}
                </span>
              </span>

              {/* Admin Panel Button */}
              {currentUser.role === '管理員' && (
                <button
                    onClick={() => setAdminPanelOpen(true)}
                    className="relative group p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 transition-all duration-300"
                    title={t('adminPanel')}
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </button>
              )}

              {/* Settings Button */}
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full transition-all duration-200 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 group"
                title={t('settings')}
              >
                <Cog6ToothIcon className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2.5 text-slate-700 dark:text-slate-200 hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-red-500 dark:hover:bg-red-600 border border-slate-200 dark:border-slate-700 hover:border-red-500 rounded-full transition-all duration-200 shadow-sm hover:shadow-lg group"
                title={t('logout')}
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            /* Login Button */
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-full shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <UserCircleIcon className="h-5 w-5" />
              <span className="hidden sm:inline">{t('loginOrRegister')}</span>
              <span className="sm:hidden">{t('login')}</span>
            </button>
          )}
        </div>
    </div>
  );
};
