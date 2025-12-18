
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
                setExpiryDate(new Date(isEditing.subscriptionExpiry).toISOString().split('T')[0]);
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
        let result;
        if (isAdding) {
            result = await addUser({ email, password, role, name, phone });
        } else if (isEditing) {
            const updatedData: Partial<User> = { role, name, phone };
            if (password) updatedData.password = password;

            if (expiryDate) {
                updatedData.subscriptionExpiry = new Date(expiryDate).toISOString();
            } else {
                updatedData.subscriptionExpiry = null;
            }

            result = await updateUser(isEditing.email, updatedData);
        } else { return; }

        if (result.success) {
            setSuccess(t(result.messageKey));
            await refreshUsers();
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

    const handleSendRealEmail = async () => {
        if (!isEditing) return;
        if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
            setError(t('paypalNotConfigured')); // Reuse or create new key if needed, but the image shows missing SMTP info notice
            return;
        }
        setSendingEmail(true);
        setSuccess(''); setError('');

        const subject = `[AI房產估價師] ${t('about')} - ${t('adminPanel')}`;
        const text = `親愛的 ${isEditing.name || t('generalUser')} ${t('welcomeMessageTitle')},\n\n您的帳號狀態已更新為：${t(isEditing.role)}\n訂閱到期日：${isEditing.subscriptionExpiry ? new Date(isEditing.subscriptionExpiry).toLocaleDateString() : '-'}\n\n--\n${t('appTitle')}`;

        const result = await sendEmail({
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: settings.smtpPass,
            to: isEditing.email,
            cc: settings.smtpUser,
            subject,
            text
        });

        setSendingEmail(false);
        if (result.success) setSuccess(`郵件已發送至 ${isEditing.email}`);
        else setError(`發送失敗: ${result.error}`);
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
            setIsEditing({ ...isEditing, role: '付費用戶', subscriptionExpiry: isoDate });
            setRole('付費用戶');
            setExpiryDate(isoDate.split('T')[0]);

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
                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    {/* Left Sidebar */}
                    <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-r p-4 overflow-y-auto">
                        <div className="space-y-8">
                            <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-xl">
                                <h3 className="font-bold mb-3 flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5" />{t('systemConfiguration')}</h3>

                                {/* Database Status */}
                                <div className="mb-4 p-3 rounded-lg border bg-green-100 border-green-200 text-green-800">
                                    <div className="flex items-center gap-2 font-bold text-sm">
                                        <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
                                        <span>{t('cloudDatabaseStatus')}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-semibold text-gray-500">PayPal Client ID</label>
                                            <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">{t('getPaypalClientId')} <LinkIcon className="h-3 w-3" /></a>
                                        </div>
                                        <input type="text" value={paypalClientId} onChange={e => setPaypalClientId(e.target.value.trim())} className="w-full border p-1 rounded text-sm" />
                                    </div>
                                    <div className="border-t pt-2">
                                        <h4 className="text-xs font-bold text-gray-500 mb-2">{t('smtpSettings')}</h4>
                                        <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder={t('smtpHostLabel')} />
                                        <input type="text" value={smtpPort} onChange={e => setSmtpPort(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder={t('smtpPortLabel')} />
                                        <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder={t('smtpUserLabel')} />
                                        <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value.trim())} className="w-full border p-1 rounded text-sm" placeholder={t('smtpPassLabel')} />
                                    </div>
                                    <div className="border-t pt-2">
                                        <h4 className="text-xs font-bold text-gray-500 mb-2">{t('copyrightManagement')}</h4>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[10px] text-gray-400">{t('publishUnit')}</label>
                                                <input type="text" value={publishUnit} onChange={e => setPublishUnit(e.target.value)} className="w-full border p-1 rounded text-sm" placeholder="Mazylab Studio" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400">{t('publishVersion')}</label>
                                                <input type="text" value={publishVersion} onChange={e => setPublishVersion(e.target.value)} className="w-full border p-1 rounded text-sm" placeholder="v.1.120" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-400">{t('contactEmail')}</label>
                                                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full border p-1 rounded text-sm" placeholder="contact@example.com" />
                                            </div>
                                        </div>
                                    </div>
                                    <div><label className="text-xs font-semibold text-gray-500">{t('adminNotificationEmailLabel')}</label><input type="email" value={systemEmail} onChange={e => setSystemEmail(e.target.value.trim())} className="w-full border p-1 rounded text-sm" /></div>
                                    <button onClick={handleSaveConfig} className="w-full bg-gray-800 text-white text-sm font-bold rounded py-2">{t('saveConfiguration')}</button>
                                    <button onClick={handleSimulatePaymentForAdmin} className="w-full bg-amber-600 text-white text-xs font-bold rounded py-2 mt-2">{t('simulatePayment')}</button>
                                    {configSuccess && <p className="text-xs text-green-600 text-center">{configSuccess}</p>}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-800 mb-2">{t('dataAndBackup')}</h3>

                                <div className="mb-4 pb-4 border-b border-blue-200">
                                    <button onClick={handleSystemBackup} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded py-2 mb-2 flex items-center justify-center gap-2 shadow-sm transition-colors">
                                        <ArrowDownTrayIcon className="h-4 w-4" /> {t('backupSystem')}
                                    </button>
                                    <input type="file" accept=".json" onChange={handleSystemRestore} ref={restoreInputRef} className="hidden" />
                                    <button onClick={() => restoreInputRef.current?.click()} className="w-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-sm rounded py-2 flex items-center justify-center gap-2 shadow-sm transition-colors">
                                        <ArrowUpTrayIcon className="h-4 w-4" /> {t('restoreSystem')}
                                    </button>
                                </div>

                                <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 text-white text-sm rounded py-2 mb-2">{t('importCsv')}</button>
                                <button onClick={handleClearData} className="w-full border border-red-200 text-red-600 text-sm rounded py-2">{t('clearImportedData')}</button>
                                {importStatus && <p className="text-xs text-blue-700 text-center mt-2 font-bold">{importStatus}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="flex-grow p-6 overflow-y-auto bg-white dark:bg-gray-900">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold">{t('userList')}</h3>
                                <button
                                    onClick={handleRefreshUsers}
                                    disabled={isRefreshing}
                                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                                    title="重新整理列表"
                                >
                                    <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                                </button>
                            </div>
                            <div className="flex gap-3"><button onClick={handleExportCsv} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">{t('exportCsv')}</button><button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">+ {t('addUser')}</button></div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border mb-6"><table className="w-full text-left"><thead className="bg-gray-50"><tr><th className="p-4 text-sm">Email</th><th className="p-4 text-sm">{t('nameLabel')}</th><th className="p-4 text-sm">{t('roleLabel')}</th><th className="p-4 text-sm">{t('expiryLabel')}</th><th className="p-4 text-sm text-right">{t('actionLabel')}</th></tr></thead><tbody>{users.map(u => (<tr key={u.email} className="border-t"><td className="p-4 text-sm">{u.email}</td><td className="p-4 text-sm">{u.name}</td><td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{t(u.role)}</span></td><td className="p-4 text-sm">{u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '-'}</td><td className="p-4 text-right"><button onClick={() => handleEdit(u)} className="text-blue-600 mr-2">{t('edit')}</button>
                            {u.email === currentUser?.email ? (
                                <span className="text-gray-400 cursor-not-allowed" title={t('cannotDeleteSelf')}>{t('delete')}</span>
                            ) : (
                                <button onClick={() => initiateDelete(u.email)} className="text-red-600">{t('delete')}</button>
                            )}
                        </td></tr>))}</tbody></table></div>
                        {(isEditing || isAdding) && (
                            <div className="bg-gray-50 p-6 rounded-xl border">
                                <h3 className="font-bold mb-4">{isAdding ? t('addUserTitle') : t('editUserTitle')}</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!isEditing} placeholder="Email" className="w-full border p-2 rounded" required />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('password')}</label>
                                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEditing ? t('passwordPlaceholderEdit') : t('passwordPlaceholderAdd')} className="w-full border p-2 rounded" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('name')}</label>
                                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('name')} className="w-full border p-2 rounded" required />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('phone')}</label>
                                            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phone')} className="w-full border p-2 rounded" required />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('role')}</label>
                                            <select value={role} onChange={e => handleRoleChange(e.target.value as UserRole)} className="w-full border p-2 rounded bg-white">
                                                {roles.map(r => <option key={r} value={r}>{t(r)}</option>)}
                                            </select>
                                        </div>
                                        {isEditing && (
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('expiryLabel')}</label>
                                                <input
                                                    type="date"
                                                    value={expiryDate}
                                                    onChange={e => setExpiryDate(e.target.value)}
                                                    className="w-full border p-2 rounded bg-white"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1">{t('expiryHint')}</p>
                                            </div>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                                            <h4 className="font-bold text-green-800 mb-2">{t('quickSubscription')}</h4>
                                            <div className="flex gap-2 mb-3">
                                                <button type="button" onClick={() => handleExtendSubscription(30)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors">+30 {t('days') || 'Days'}</button>
                                                <button type="button" onClick={() => handleExtendSubscription(120)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors">+120 {t('days') || 'Days'}</button>
                                                <button type="button" onClick={() => handleExtendSubscription(365)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors">+365 {t('days') || 'Days'}</button>
                                            </div>
                                            <div className="border-t border-green-200 pt-3">
                                                <button type="button" onClick={handleSendRealEmail} disabled={sendingEmail} className="text-xs text-green-700 font-bold flex items-center gap-1 disabled:opacity-50 hover:underline">
                                                    <EnvelopeIcon className="h-3 w-3" /> {sendingEmail ? t('sending') : t('sendAccountEmail')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                                        <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">{t('cancel')}</button>
                                        <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm">{t('saveChanges')}</button>
                                    </div>
                                </form>
                            </div>
                        )}
                        {(success || error) && <div className={`mt-4 p-4 rounded ${success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{success || error}</div>}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {userToDelete && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"><div className="bg-white p-6 rounded shadow-lg"><h3>{t('deleteConfirmTitle')}</h3><div className="flex gap-2 mt-4"><button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 rounded">{t('cancel')}</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t('delete')}</button></div></div></div>}
        </div>
    );
};
