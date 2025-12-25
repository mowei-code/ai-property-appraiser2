
import React, { useState, useContext, useEffect, useRef } from 'react';
import type { User, UserRole } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { isSupabaseConfigured } from '../supabaseClient';
import { XMarkIcon } from './icons/XMarkIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { parseMOICSV } from '../utils';
import { saveImportedTransactions, clearImportedTransactions } from '../services/realEstateService';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LinkIcon } from './icons/LinkIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { sendEmail } from '../services/emailService';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { SparklesIcon } from './icons/SparklesIcon';

export const AdminPanel: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, refreshUsers, setAdminPanelOpen, currentUser, forceReconnect } = useContext(AuthContext);
    const { t, settings, saveSettings } = useContext(SettingsContext);
    const [isEditing, setIsEditing] = useState<User | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('一般用戶');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [importStatus, setImportStatus] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'configuration'>('users');
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Settings State
    const [paypalClientId, setPaypalClientId] = useState('');
    const [systemEmail, setSystemEmail] = useState('');
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPass, setSmtpPass] = useState('');
    const [publishUnit, setPublishUnit] = useState('');
    const [publishVersion, setPublishVersion] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [configSuccess, setConfigSuccess] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    const roles: UserRole[] = ['管理員', '一般用戶', '付費用戶'];

    // Sync settings when panel opens
    useEffect(() => {
        setPaypalClientId(settings.paypalClientId || '');
        setSystemEmail(settings.systemEmail || '');
        setSmtpHost(settings.smtpHost || '');
        setSmtpPort(settings.smtpPort || '587');
        setSmtpUser(settings.smtpUser || '');
        setSmtpPass(settings.smtpPass || '');
        setPublishUnit(settings.publishUnit || '');
        setPublishVersion(settings.publishVersion || '');
        setContactEmail(settings.contactEmail || '');
    }, [settings]);

    useEffect(() => {
        if (isSupabaseConfigured) {
            handleRefreshUsers();
        }
    }, []);

    useEffect(() => {
        if (isEditing) {
            setEmail(isEditing.email);
            setPassword('');
            setRole(isEditing.role);
            setName(isEditing.name || '');
            setPhone(isEditing.phone || '');
            if (isEditing.subscriptionExpiry) {
                try {
                    setExpiryDate(new Date(isEditing.subscriptionExpiry).toISOString().split('T')[0]);
                } catch (e) {
                    setExpiryDate('');
                }
            } else {
                setExpiryDate('');
            }
        }
    }, [isEditing]);

    const resetForm = () => {
        setIsAdding(false);
        setIsEditing(null);
        setEmail('');
        setPassword('');
        setRole('一般用戶');
        setName('');
        setPhone('');
        setExpiryDate('');
        setError('');
        setSuccess('');
    };

    const handleRefreshUsers = async () => {
        setIsRefreshing(true);
        await refreshUsers();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleRoleChange = (newRole: UserRole) => {
        setRole(newRole);
        if (newRole === '付費用戶' && !expiryDate) {
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);
            setExpiryDate(nextMonth.toISOString().split('T')[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        let finalUserForEmail: User | null = null;

        if (isAdding) {
            result = await addUser({ email, password, role, name, phone });
            if (result.success) {
                finalUserForEmail = {
                    email,
                    role,
                    name,
                    phone,
                    subscriptionExpiry: role === '付費用戶' && !expiryDate ?
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() :
                        (expiryDate ? new Date(expiryDate).toISOString() : null)
                } as User;
            }
        } else if (isEditing) {
            const updatedData: Partial<User> = { role, name, phone };
            if (password) updatedData.password = password;
            updatedData.subscriptionExpiry = expiryDate ? new Date(expiryDate).toISOString() : null;

            result = await updateUser(isEditing.email, updatedData);
            if (result.success) {
                finalUserForEmail = { ...isEditing, ...updatedData } as User;
            }
        } else { return; }

        if (result.success) {
            setSuccess(t(result.messageKey));
            await refreshUsers();

            // Automated Email Notification (Only for new users)
            if (finalUserForEmail && isAdding) {
                triggerAdminActionEmail(finalUserForEmail, 'welcome', expiryDate);
            }

            if (isAdding) resetForm();
        } else {
            setError(t(result.messageKey) + (result.message ? `: ${result.message}` : ''));
        }
    };

    const handleSaveConfig = () => {
        saveSettings({
            paypalClientId: paypalClientId.trim(),
            systemEmail: systemEmail.trim(),
            smtpHost: smtpHost.trim(),
            smtpPort: smtpPort.trim(),
            smtpUser: smtpUser.trim(),
            smtpPass: smtpPass.trim(),
            publishUnit: publishUnit.trim(),
            publishVersion: publishVersion.trim(),
            contactEmail: contactEmail.trim()
        });
        setConfigSuccess(t('configSaved'));
        setError('');
        setTimeout(() => setConfigSuccess(''), 3000);
    };

    const triggerAdminActionEmail = async (user: User, action: 'welcome' | 'update' | 'delete', customExpiryDate?: string) => {
        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            return;
        }

        let subjectKey = '';
        let bodyKey = '';

        switch (action) {
            case 'welcome':
                subjectKey = 'welcomeEmailSubject';
                bodyKey = 'welcomeEmailBody';
                break;
            case 'update':
                subjectKey = 'updateEmailSubject';
                bodyKey = 'updateEmailBody';
                break;
            case 'delete':
                subjectKey = 'deleteEmailSubject';
                bodyKey = 'deleteEmailBody';
                break;
        }

        const appTitle = t('appTitle');
        const roleName = t(user.role);

        let expiry = '-';
        try {
            if (customExpiryDate) {
                const date = new Date(customExpiryDate);
                if (!isNaN(date.getTime())) {
                    expiry = date.toLocaleDateString();
                }
            } else if (user.subscriptionExpiry) {
                const date = new Date(user.subscriptionExpiry);
                if (!isNaN(date.getTime())) {
                    expiry = date.toLocaleDateString();
                }
            }
        } catch (e) {
            console.warn("Date parsing failed in email trigger:", e);
        }

        const subject = t(subjectKey);
        const text = t(bodyKey)
            .replace('{{name}}', user.name || user.email)
            .replace('{{email}}', user.email)
            .replace('{{role}}', roleName)
            .replace('{{expiry}}', expiry)
            .replace('{{appTitle}}', `${appTitle}`);

        try {
            const result = await sendEmail({
                smtpHost: settings.smtpHost,
                smtpPort: settings.smtpPort,
                smtpUser: settings.smtpUser,
                smtpPass: settings.smtpPass,
                to: user.email,
                subject,
                text
            });

            if (result.success) {
                console.log(`Auto-email (${action}) sent to ${user.email}`);
                // Optional: Show a subtle toast or log, avoiding cluttering the main success message
            } else {
                console.error("Auto email failed:", result.error);
                setError(t('autoEmailFailed', { error: result.error }));
            }
        } catch (e) {
            console.error("Auto email exception:", e);
        }
    };

    const handleSendRealEmail = async () => {
        if (!isEditing) return;
        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            setError(t('paypalNotConfigured'));
            return;
        }
        setSendingEmail(true);
        setSuccess(''); setError('');

        // Construct a fresh user object from current form state for accurate email content
        const currentUpdatedUser: User = { ...isEditing, role, name, phone } as User;

        await triggerAdminActionEmail(currentUpdatedUser, 'update', expiryDate);
        setSendingEmail(false);
        setSuccess(t('autoEmailSent', { email: isEditing.email }));
    };

    const handleSimulatePaymentForAdmin = async () => {
        if (!currentUser) return;
        const now = new Date();
        const newExpiryDate = new Date();
        newExpiryDate.setDate(now.getDate() + 30);
        const updateData: Partial<User> = { subscriptionExpiry: newExpiryDate.toISOString() };
        if (currentUser.role !== '管理員') updateData.role = '付費用戶';

        const result = await updateUser(currentUser.email, updateData);
        if (result.success) setSuccess(t('simulateSuccess'));
        else setError(t('simulateFailed') + ": " + t(result.messageKey));
    };

    const initiateDelete = (userEmail: string) => { setUserToDelete(userEmail); setError(''); setSuccess(''); };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        // Find user details before deletion for email
        const user = users.find(u => u.email === userToDelete);
        if (user) {
            await triggerAdminActionEmail(user, 'delete');
        }

        const result = await deleteUser(userToDelete);
        if (result.success) { setSuccess(t(result.messageKey)); if (isEditing?.email === userToDelete) resetForm(); }
        else { setError(t(result.messageKey) + (result.message ? `: ${result.message}` : '')); }
        setUserToDelete(null);
    };

    const handleEdit = (user: User) => { setIsAdding(false); setIsEditing(user); setSuccess(''); setError(''); };
    const handleAddNew = () => { resetForm(); setIsAdding(true); };

    const handleExtendSubscription = async (days: number) => {
        if (!isEditing) return;
        const now = new Date();
        let newExpiryDate = now;

        const baseDate = expiryDate ? new Date(expiryDate) : (isEditing.subscriptionExpiry ? new Date(isEditing.subscriptionExpiry) : now);

        if (baseDate > now) {
            newExpiryDate = new Date(baseDate);
        }

        newExpiryDate.setDate(newExpiryDate.getDate() + days);
        const isoDate = newExpiryDate.toISOString();

        const result = await updateUser(isEditing.email, { role: '付費用戶', subscriptionExpiry: isoDate });

        if (result.success) {
            setSuccess(t('subscriptionExtended', { date: newExpiryDate.toLocaleDateString() }));

            // Auto Email for Quick Subscription
            const updatedUser = { ...isEditing, role: '付費用戶', subscriptionExpiry: isoDate } as User;
            setIsEditing(updatedUser);
            setRole('付費用戶');
            setExpiryDate(isoDate.split('T')[0]);

            triggerAdminActionEmail(updatedUser, 'update', isoDate.split('T')[0]);

            await refreshUsers();
        } else {
            setError(t(result.messageKey) + (result.message ? `: ${result.message}` : ''));
        }
    };

    const handleExportCsv = () => {
        const headers = ['Email', 'Name', 'Phone', 'Role', 'Subscription Expiry'];
        const csvContent = [headers.join(','), ...users.map(u => [u.email, u.name || '', u.phone || '', u.role, u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '-'].join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `members.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setImportStatus(t('importing'));
        const reader = new FileReader();
        reader.readAsText(file, 'Big5');
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                const properties = parseMOICSV(content);
                if (properties.length > 0) {
                    const count = saveImportedTransactions(properties);
                    setImportStatus(t('importSuccess', { count: count.toString() }));
                } else {
                    setImportStatus(t('importFailedNoData'));
                }
            }
        };
    };
    const handleClearData = () => {
        if (window.confirm(t('confirmClearData'))) { clearImportedTransactions(); setImportStatus(t('dataCleared')); }
    };

    const handleSystemBackup = () => {
        const backupData = {
            users: localStorage.getItem('app_users'),
            settings: localStorage.getItem('app_system_settings'),
            realEstateData: localStorage.getItem('imported_real_estate_data'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        link.setAttribute('href', url);
        link.setAttribute('download', `aiproperty_backup_${dateStr}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setImportStatus(t('backupRestoreNotice'));
    };

    const handleSystemRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm(t('restoreWarning'))) {
            if (restoreInputRef.current) restoreInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const backup = JSON.parse(content);

                if (backup.users) localStorage.setItem('app_users', backup.users);
                if (backup.settings) localStorage.setItem('app_system_settings', backup.settings);
                if (backup.realEstateData) localStorage.setItem('imported_real_estate_data', backup.realEstateData);

                alert(t('restoreSuccess'));
                window.location.reload();
            } catch (err) {
                console.error("Restore failed", err);
                alert(t('restoreFailed'));
            }
        };
        reader.readAsText(file);
    };

    // --- Block if Supabase missing ---
    if (!isSupabaseConfigured) {
        return (
            <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl p-8 border border-red-500 flex flex-col items-center text-center">
                    <ExclamationTriangleIcon className="h-20 w-20 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('paymentError')}</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                        {t('adminApiKeySetupRequired')}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={forceReconnect} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2">
                            <ArrowPathIcon className="h-5 w-5" /> {t('revaluate')}
                        </button>
                        <button onClick={() => setAdminPanelOpen(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold">
                            {t('close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-orange-400 dark:border-orange-500">
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><ShieldCheckIcon className="h-8 w-8 text-blue-600" />{t('adminPanel')}</h2>
                    <button onClick={() => setAdminPanelOpen(false)} className="p-2 rounded-full hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'users'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {t('userList')}
                    </button>
                    <button
                        onClick={() => setActiveTab('configuration')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'configuration'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        {t('systemConfiguration')}
                    </button>
                </div>

                <div className="flex flex-col h-full overflow-hidden">
                    {/* Main Content Area */}
                    <div className="flex-grow p-6 overflow-y-auto bg-white dark:bg-gray-900">
                        {activeTab === 'configuration' ? (
                            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                                            <Cog6ToothIcon className="h-5 w-5 text-blue-500" />
                                            {t('systemConfiguration')}
                                        </h3>

                                        {/* Database Status */}
                                        <div className="mb-6 p-4 rounded-xl border bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-800 dark:text-green-300">
                                            <div className="flex items-center gap-3 font-bold text-sm">
                                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                                                <span>{t('cloudDatabaseStatus')}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">PayPal Client ID</label>
                                                    <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">{t('getPaypalClientId')} <LinkIcon className="h-3 w-3" /></a>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={paypalClientId}
                                                    onChange={e => setPaypalClientId(e.target.value.trim())}
                                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('smtpSettings')}</h4>
                                                <div className="space-y-3">
                                                    <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value.trim())} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder={t('smtpHostLabel')} />
                                                    <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value.trim())} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder={t('smtpPortLabel')} />
                                                    <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value.trim())} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder={t('smtpUserLabel')} />
                                                    <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value.trim())} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder={t('smtpPassLabel')} />
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                                                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4">{t('copyrightManagement')}</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs text-gray-400 mb-1 block">{t('publishUnit')}</label>
                                                        <input type="text" value={publishUnit} onChange={e => setPublishUnit(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder="Mazylab Studio" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-400 mb-1 block">{t('publishVersion')}</label>
                                                        <input type="text" value={publishVersion} onChange={e => setPublishVersion(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder="v.1.120" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-400 mb-1 block">{t('contactEmail')}</label>
                                                        <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" placeholder="contact@example.com" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                                                <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">{t('adminNotificationEmailLabel')}</label>
                                                <input type="email" value={systemEmail} onChange={e => setSystemEmail(e.target.value.trim())} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm" />
                                            </div>

                                            <div className="pt-4 flex flex-col gap-3">
                                                <button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 shadow-lg shadow-blue-500/20 transition-all active:scale-95">{t('saveConfiguration')}</button>
                                                <button onClick={handleSimulatePaymentForAdmin} className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl py-2.5 transition-all">{t('simulatePayment')}</button>
                                                {configSuccess && <p className="text-sm text-green-600 font-bold text-center animate-bounce">{configSuccess}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm">
                                            <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                                                <ArrowDownTrayIcon className="h-5 w-5" />
                                                {t('dataAndBackup')}
                                            </h3>

                                            <div className="space-y-4">
                                                <div className="pb-4 border-b border-blue-200 dark:border-blue-800/50 flex flex-col gap-3">
                                                    <button onClick={handleSystemBackup} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                                        <ArrowDownTrayIcon className="h-5 w-5" /> {t('backupSystem')}
                                                    </button>
                                                    <input type="file" accept=".json" onChange={handleSystemRestore} ref={restoreInputRef} className="hidden" />
                                                    <button onClick={() => restoreInputRef.current?.click()} className="w-full bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all">
                                                        <ArrowUpTrayIcon className="h-5 w-5" /> {t('restoreSystem')}
                                                    </button>
                                                </div>

                                                <div className="flex flex-col gap-3 mt-4">
                                                    <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                                                    <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                                                        <ArrowDownTrayIcon className="h-5 w-5 transform rotate-180" /> {t('importCsv')}
                                                    </button>
                                                    <button onClick={handleClearData} className="w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 font-bold rounded-xl py-2.5 transition-all">
                                                        {t('clearImportedData')}
                                                    </button>
                                                </div>

                                                {importStatus && <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-800 dark:text-blue-300 text-sm text-center font-bold border border-blue-200 dark:border-blue-800 animate-pulse">{importStatus}</div>}
                                            </div>
                                        </div>

                                        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-400 leading-relaxed shadow-sm">
                                            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
                                                <ExclamationTriangleIcon className="h-4 w-4" />
                                                Admin Note
                                            </div>
                                            {t('dataManagementHint')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-black text-gray-800 dark:text-white">{t('userList')}</h3>
                                        <button
                                            onClick={handleRefreshUsers}
                                            disabled={isRefreshing}
                                            className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90"
                                            title="重新整理列表"
                                        >
                                            <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={handleExportCsv} className="flex-1 lg:flex-none border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-6 py-2.5 rounded-xl text-sm font-black hover:bg-green-100 dark:hover:bg-green-900/40 transition-all flex items-center justify-center gap-2">
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            {t('exportCsv')}
                                        </button>
                                        <button onClick={handleAddNew} className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                            <span className="text-xl leading-none">+</span>
                                            {t('addUser')}
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl mb-8 bg-white dark:bg-gray-900">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                                                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">Email</th>
                                                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">{t('nameLabel')}</th>
                                                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">{t('roleLabel')}</th>
                                                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest">{t('expiryLabel')}</th>
                                                    <th className="p-5 text-xs font-black text-gray-500 uppercase tracking-widest text-right">{t('actionLabel')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {users.map(u => (
                                                    <tr key={u.email} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-5 text-sm font-medium text-gray-800 dark:text-gray-200">{u.email}</td>
                                                        <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{u.name}</td>
                                                        <td className="p-5">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${u.role === '管理員' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                u.role === '付費用戶' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                                }`}>
                                                                {t(u.role)}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-sm text-gray-600 dark:text-gray-400">{u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '-'}</td>
                                                        <td className="p-5 text-right">
                                                            <div className="flex justify-end items-center gap-3">
                                                                <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-700 font-bold p-1 rounded-lg hover:bg-blue-50 transition-all">{t('edit')}</button>
                                                                {u.email === currentUser?.email ? (
                                                                    <span className="text-gray-300 dark:text-gray-600 cursor-not-allowed text-sm font-bold">{t('delete')}</span>
                                                                ) : (
                                                                    <button onClick={() => initiateDelete(u.email)} className="text-red-500 hover:text-red-600 font-bold p-1 rounded-lg hover:bg-red-50 transition-all">{t('delete')}</button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {(isEditing || isAdding) && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-inner">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                                                <Cog6ToothIcon className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-800 dark:text-white">{isAdding ? t('addUserTitle') : t('editUserTitle')}</h3>
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Email</label>
                                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!isEditing} placeholder="Email" className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-50" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{t('password')}</label>
                                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEditing ? t('passwordPlaceholderEdit') : t('passwordPlaceholderAdd')} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{t('name')}</label>
                                                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('name')} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{t('phone')}</label>
                                                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phone')} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{t('role')}</label>
                                                    <select value={role} onChange={e => handleRoleChange(e.target.value as UserRole)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer">
                                                        {roles.map(r => <option key={r} value={r}>{t(r)}</option>)}
                                                    </select>
                                                </div>
                                                {isEditing && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">{t('expiryLabel')}</label>
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                value={expiryDate}
                                                                onChange={e => setExpiryDate(e.target.value)}
                                                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none"
                                                            />
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 mt-1 ml-1">{t('expiryHint')}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing && (
                                                <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-100 dark:border-green-800/50 rounded-3xl">
                                                    <h4 className="text-sm font-black text-green-800 dark:text-green-400 mb-4 flex items-center gap-2">
                                                        <SparklesIcon className="h-4 w-4" />
                                                        {t('quickSubscription')}
                                                    </h4>
                                                    <div className="flex flex-wrap gap-3 mb-6">
                                                        <button type="button" onClick={() => handleExtendSubscription(30)} className="bg-white dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95">+30 {t('days') || 'Days'}</button>
                                                        <button type="button" onClick={() => handleExtendSubscription(120)} className="bg-white dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95">+120 {t('days') || 'Days'}</button>
                                                        <button type="button" onClick={() => handleExtendSubscription(365)} className="bg-white dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm active:scale-95">+365 {t('days') || 'Days'}</button>
                                                    </div>
                                                    <div className="border-t border-green-100 dark:border-green-800/50 pt-4">
                                                        <button type="button" onClick={handleSendRealEmail} disabled={sendingEmail} className="text-xs text-green-700 dark:text-green-400 font-black flex items-center gap-2 disabled:opacity-50 hover:bg-green-600 hover:text-white px-4 py-2 rounded-xl transition-all w-fit">
                                                            <EnvelopeIcon className="h-4 w-4" />
                                                            {sendingEmail ? t('sending') : t('sendAccountEmail')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                                                <button type="button" onClick={resetForm} className="px-8 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-bold transition-all">{t('cancel')}</button>
                                                <button type="submit" className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95">{t('saveChanges')}</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {(success || error) && (
                                    <div className={`mt-8 p-5 rounded-2xl font-bold flex items-center gap-3 animate-slide-up ${success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {success ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
                                        {success || error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {userToDelete && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"><div className="bg-white p-6 rounded shadow-lg"><h3>{t('deleteConfirmTitle')}</h3><div className="flex gap-2 mt-4"><button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 rounded">{t('cancel')}</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t('delete')}</button></div></div></div>}
        </div>
    );
};
