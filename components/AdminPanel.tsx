import React, { useState, useContext, useEffect, useRef } from 'react';
import type { User, UserRole } from '../types';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { XMarkIcon } from './icons/XMarkIcon';
import { Cog6ToothIcon } from './icons/Cog6ToothIcon';
import { parseMOICSV } from '../utils';
import { saveImportedTransactions, clearImportedTransactions } from '../services/realEstateService';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { LinkIcon } from './icons/LinkIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { sendEmail } from '../services/emailService'; // Import 新的服務

export const AdminPanel: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, setAdminPanelOpen, currentUser } = useContext(AuthContext);
  const { t, settings, saveSettings } = useContext(SettingsContext);
  const [isEditing, setIsEditing] = useState<User | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('一般用戶');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importStatus, setImportStatus] = useState('');
  
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // Settings State
  const [paypalClientId, setPaypalClientId] = useState(settings.paypalClientId || '');
  const [systemEmail, setSystemEmail] = useState(settings.systemEmail || '');
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(settings.smtpPass || '');
  const [configSuccess, setConfigSuccess] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const roles: UserRole[] = ['管理員', '一般用戶', '付費用戶'];

  useEffect(() => {
    if (isEditing) {
      setEmail(isEditing.email);
      setPassword(''); 
      setRole(isEditing.role);
      setName(isEditing.name || '');
      setPhone(isEditing.phone || '');
    }
  }, [isEditing]);
  
  useEffect(() => {
      setPaypalClientId(settings.paypalClientId || '');
      setSystemEmail(settings.systemEmail || '');
      setSmtpHost(settings.smtpHost || '');
      setSmtpPort(settings.smtpPort || '587');
      setSmtpUser(settings.smtpUser || '');
      setSmtpPass(settings.smtpPass || '');
  }, [settings]);

  const resetForm = () => {
    setIsAdding(false);
    setIsEditing(null);
    setEmail('');
    setPassword('');
    setRole('一般用戶');
    setName('');
    setPhone('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    let result;
    if (isAdding) {
      result = addUser({ email, password, role, name, phone });
    } else if (isEditing) {
      const updatedData: Partial<User> = { role, name, phone };
      if (password) updatedData.password = password;
      result = updateUser(isEditing.email, updatedData);
    } else { return; }

    if (result.success) {
      setSuccess(t(result.messageKey));
      if(isAdding) resetForm();
    } else {
      setError(t(result.messageKey));
    }
  };
  
  const handleSaveConfig = () => {
      saveSettings({ 
          paypalClientId: paypalClientId.trim(),
          systemEmail: systemEmail.trim(),
          smtpHost: smtpHost.trim(),
          smtpPort: smtpPort.trim(),
          smtpUser: smtpUser.trim(),
          smtpPass: smtpPass.trim()
      });
      setConfigSuccess(t('configSaved'));
      setError('');
      setTimeout(() => setConfigSuccess(''), 3000);
  };

  const handleSendRealEmail = async () => {
      if (!isEditing) return;
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
          setError("請先在左側系統設定中設定 SMTP 資訊 (Host, User, Password)。");
          return;
      }
      setSendingEmail(true);
      setSuccess(''); setError('');

      const subject = `[AI房產估價師] 帳號通知`;
      const text = `親愛的 ${isEditing.name || '會員'} 您好，\n\n您的帳號狀態已更新為：${isEditing.role}\n訂閱到期日：${isEditing.subscriptionExpiry ? new Date(isEditing.subscriptionExpiry).toLocaleDateString() : '無'}\n\n--\nAI 房產估價師系統`;
      
      // 使用統一的 emailService
      const result = await sendEmail({
          smtpHost: settings.smtpHost, 
          smtpPort: settings.smtpPort, 
          smtpUser: settings.smtpUser, 
          smtpPass: settings.smtpPass,
          to: isEditing.email, // 主要收件人：會員
          cc: settings.smtpUser, // 副本：管理員(自己)
          subject, 
          text
      });

      setSendingEmail(false);
      if (result.success) setSuccess(`郵件已發送至 ${isEditing.email}`);
      else setError(`發送失敗: ${result.error}`);
  };

  const handleSimulatePaymentForAdmin = () => {
      if (!currentUser) return;
      const now = new Date();
      const newExpiryDate = new Date();
      newExpiryDate.setDate(now.getDate() + 30); 
      const updateData: Partial<User> = { subscriptionExpiry: newExpiryDate.toISOString() };
      if (currentUser.role !== '管理員') updateData.role = '付費用戶';
      
      const result = updateUser(currentUser.email, updateData);
      if (result.success) setSuccess("模擬成功！已延長30天訂閱。");
      else setError("模擬失敗: " + t(result.messageKey));
  };

  const initiateDelete = (userEmail: string) => { setUserToDelete(userEmail); setError(''); setSuccess(''); };
  const confirmDelete = () => {
    if (!userToDelete) return;
    const result = deleteUser(userToDelete);
    if (result.success) { setSuccess(t(result.messageKey)); if (isEditing?.email === userToDelete) resetForm(); } 
    else { setError(t(result.messageKey)); }
    setUserToDelete(null);
  };
  const handleEdit = (user: User) => { setIsAdding(false); setIsEditing(user); setSuccess(''); setError(''); };
  const handleAddNew = () => { resetForm(); setIsAdding(true); };
  const handleExtendSubscription = (days: number) => {
      if (!isEditing) return;
      const now = new Date();
      let newExpiryDate = now;
      if (isEditing.subscriptionExpiry) {
          const currentExpiry = new Date(isEditing.subscriptionExpiry);
          if (currentExpiry > now) newExpiryDate = currentExpiry;
      }
      newExpiryDate.setDate(newExpiryDate.getDate() + days);
      const result = updateUser(isEditing.email, { role: '付費用戶', subscriptionExpiry: newExpiryDate.toISOString() });
      if (result.success) {
          setSuccess(t('subscriptionExtended', { date: newExpiryDate.toLocaleDateString() }));
          setIsEditing({ ...isEditing, role: '付費用戶', subscriptionExpiry: newExpiryDate.toISOString() });
          setRole('付費用戶');
      } else { setError(t(result.messageKey)); }
  };

  const handleExportCsv = () => {
    const headers = ['Email', 'Name', 'Phone', 'Role', 'Subscription Expiry'];
    const csvContent = [headers.join(','), ...users.map(u => [u.email, u.name||'', u.phone||'', u.role, u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : '-'].join(','))].join('\n');
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
               if(properties.length > 0) {
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

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-orange-400 dark:border-orange-500">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3"><ShieldCheckIcon className="h-8 w-8 text-blue-600" />{t('adminPanel')}</h2>
          <button onClick={() => setAdminPanelOpen(false)} className="p-2 rounded-full hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
        </div>
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800 border-r p-4 overflow-y-auto">
            <div className="space-y-8">
                <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-xl">
                    <h3 className="font-bold mb-3 flex items-center gap-2"><Cog6ToothIcon className="h-5 w-5" />{t('systemConfiguration')}</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-semibold text-gray-500">PayPal Client ID</label>
                                <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Get ID <LinkIcon className="h-3 w-3" /></a>
                            </div>
                            <input type="text" value={paypalClientId} onChange={e=>setPaypalClientId(e.target.value.trim())} className="w-full border p-1 rounded text-sm" />
                        </div>
                        <div className="border-t pt-2">
                            <h4 className="text-xs font-bold text-gray-500 mb-2">SMTP 設定 (通知信)</h4>
                            <input type="text" value={smtpHost} onChange={e=>setSmtpHost(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder="Host (e.g. smtp.gmail.com)" />
                            <input type="text" value={smtpPort} onChange={e=>setSmtpPort(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder="Port (587)" />
                            <input type="text" value={smtpUser} onChange={e=>setSmtpUser(e.target.value.trim())} className="w-full border p-1 rounded text-sm mb-1" placeholder="User / Email" />
                            <input type="password" value={smtpPass} onChange={e=>setSmtpPass(e.target.value.trim())} className="w-full border p-1 rounded text-sm" placeholder="App Password" />
                        </div>
                        <div><label className="text-xs font-semibold text-gray-500">管理員 Email (接收通知用)</label><input type="email" value={systemEmail} onChange={e=>setSystemEmail(e.target.value.trim())} className="w-full border p-1 rounded text-sm" /></div>
                        <button onClick={handleSaveConfig} className="w-full bg-gray-800 text-white text-sm font-bold rounded py-2">{t('saveConfiguration')}</button>
                        <button onClick={handleSimulatePaymentForAdmin} className="w-full bg-amber-600 text-white text-xs font-bold rounded py-2 mt-2">模擬付款 (自身測試)</button>
                        {configSuccess && <p className="text-xs text-green-600 text-center">{configSuccess}</p>}
                    </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="font-bold text-blue-800 mb-2">資料管理</h3>
                    <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                    <button onClick={()=>fileInputRef.current?.click()} className="w-full bg-blue-600 text-white text-sm rounded py-2 mb-2">匯入 CSV</button>
                    <button onClick={handleClearData} className="w-full border border-red-200 text-red-600 text-sm rounded py-2">清除資料</button>
                    {importStatus && <p className="text-xs text-blue-700 text-center mt-2">{importStatus}</p>}
                </div>
            </div>
          </div>
          <div className="flex-grow p-6 overflow-y-auto bg-white dark:bg-gray-900">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t('userList')}</h3>
                <div className="flex gap-3"><button onClick={handleExportCsv} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">{t('exportCsv')}</button><button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">+ {t('addUser')}</button></div>
            </div>
            <div className="overflow-x-auto rounded-xl border mb-6"><table className="w-full text-left"><thead className="bg-gray-50"><tr><th className="p-4 text-sm">Email</th><th className="p-4 text-sm">Name</th><th className="p-4 text-sm">Role</th><th className="p-4 text-sm">Expiry</th><th className="p-4 text-sm text-right">Action</th></tr></thead><tbody>{users.map(u=>(<tr key={u.email} className="border-t"><td className="p-4 text-sm">{u.email}</td><td className="p-4 text-sm">{u.name}</td><td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{t(u.role)}</span></td><td className="p-4 text-sm">{u.subscriptionExpiry?new Date(u.subscriptionExpiry).toLocaleDateString():'-'}</td><td className="p-4 text-right"><button onClick={()=>handleEdit(u)} className="text-blue-600 mr-2">Edit</button><button onClick={()=>initiateDelete(u.email)} className="text-red-600">Del</button></td></tr>))}</tbody></table></div>
            {(isEditing||isAdding)&&(<div className="bg-gray-50 p-6 rounded-xl border"><h3 className="font-bold mb-4">{isAdding?'Add':'Edit'} User</h3><form onSubmit={handleSubmit} className="space-y-4"><div className="grid grid-cols-2 gap-4"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={!!isEditing} placeholder="Email" className="border p-2 rounded" required /><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 rounded" /><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="border p-2 rounded" required /><input type="text" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone" className="border p-2 rounded" required /><select value={role} onChange={e=>setRole(e.target.value as UserRole)} className="border p-2 rounded">{roles.map(r=><option key={r} value={r}>{t(r)}</option>)}</select></div>{isEditing&&( <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded"><h4 className="font-bold text-green-800 mb-2">訂閱管理</h4><div className="flex gap-2 mb-3"><button type="button" onClick={()=>handleExtendSubscription(30)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">+30 Days</button><button type="button" onClick={()=>handleExtendSubscription(120)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">+120 Days</button><button type="button" onClick={()=>handleExtendSubscription(365)} className="bg-green-600 text-white px-3 py-1 rounded text-xs">+365 Days</button></div><div className="border-t border-green-200 pt-3"><button type="button" onClick={handleSendRealEmail} disabled={sendingEmail} className="text-xs text-green-700 font-bold flex items-center gap-1 disabled:opacity-50"><EnvelopeIcon className="h-3 w-3" /> {sendingEmail?'發送中...':'📧 發送帳號通知信'}</button></div></div>)}<div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600">{t('cancel')}</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">{t('saveChanges')}</button></div></form></div>)}
            {(success||error)&&<div className={`mt-4 p-4 rounded ${success?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{success||error}</div>}
          </div>
        </div>
      </div>
      {userToDelete && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"><div className="bg-white p-6 rounded shadow-lg"><h3>Confirm Delete?</h3><div className="flex gap-2 mt-4"><button onClick={()=>setUserToDelete(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button></div></div></div>}
    </div>
  );
};