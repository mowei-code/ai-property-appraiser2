const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Helper: load env if possible or expect them in process.env
// Electron dev mode usually loads .env via Vite, but production builds need care.
// For this environment we assume process.env is populated or we might fail.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_URL && SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('[Electron Main] Supabase Admin initialized.');
} else {
  console.warn('[Electron Main] WARNING: SUPABASE_URL or SERVICE_ROLE_KEY missing.');
}

// 處理 Windows 安裝時的 Setup 事件
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

function createWindow() {
  // 確保 preload 路徑正確。使用 __dirname 可以確保在打包後 (asar) 也能找到檔案
  const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('Preload path:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: preloadPath, // 關鍵：載入 preload 腳本
      contextIsolation: true, // 必須為 true 以配合 contextBridge
      nodeIntegration: false, // 安全性設定
      sandbox: false // 關閉沙盒以避免某些路徑問題
    },
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // 判斷開發環境或生產環境
  // 注意：這裡使用 process.env.VITE_DEV_SERVER_URL 是為了配合某些 Vite Electron 模板，
  // 但為了通用性，我們保留 localhost 判斷。
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // 開發模式開啟 F12
  } else {
    // 打包後載入 dist/index.html
    // 這裡假設 electron-builder 將 dist 資料夾打包在 app 根目錄下
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC 郵件發送邏輯 (給 .exe 使用) ---
ipcMain.handle('send-email', async (event, data) => {
  console.log('[Electron Main] 收到發信請求:', data.subject);
  console.log('[Electron Main] 收件人(To):', data.to);
  console.log('[Electron Main] 副本(CC):', data.cc);

  const { smtpHost, smtpPort, smtpUser, smtpPass, to, cc, subject, text } = data;

  // 基本驗證
  if (!smtpHost || !smtpUser || !smtpPass || !to) {
    console.error('[Electron Main] 缺少 SMTP 設定或收件人');
    return { success: false, message: '缺少 SMTP 設定或收件人' };
  }

  try {
    // 建立傳送器
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: Number(smtpPort) === 465, // 465 為 SSL, 587 為 TLS
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false // 允許自簽憑證，避免某些網路環境報錯
      }
    });

    // 驗證連線
    await transporter.verify();
    console.log('[Electron Main] SMTP 連線驗證成功');

    // 發送郵件
    // 關鍵：from 必須設定為 smtpUser，避免被 SMTP 伺服器阻擋
    const info = await transporter.sendMail({
      from: `"AI Property Appraiser" <${smtpUser}>`,
      to: to,
      cc: cc,
      subject: subject,
      text: text
    });

    console.log('[Electron Main] 發信成功:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('[Electron Main] 發信失敗:', error);
    return { success: false, message: error.message || '發送失敗' };
  }
});

// --- IPC: Admin Delete User ---
ipcMain.handle('admin:delete-user', async (event, { email }) => {
  console.log(`[Electron Main] Deleting user: ${email}`);
  if (!supabaseAdmin) return { success: false, message: 'Server misconfigured: No Admin Client.' };

  try {
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;

    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return { success: false, message: 'User not found in Auth.' };

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
    if (deleteError) throw deleteError;

    return { success: true, message: 'User deleted from Auth.' };
  } catch (e) {
    console.error('[Electron Main] Delete error:', e);
    return { success: false, message: e.message };
  }
});

// --- IPC: Admin Update Password ---
ipcMain.handle('admin:update-password', async (event, { email, password }) => {
  console.log(`[Electron Main] Updating password for: ${email}`);
  if (!supabaseAdmin) return { success: false, message: 'Server misconfigured: No Admin Client.' };

  try {
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;

    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return { success: false, message: 'User not found in Auth.' };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: password });
    if (updateError) throw updateError;

    return { success: true, message: 'Password updated successfully.' };
  } catch (e) {
    console.error('[Electron Main] Update error:', e);
    return { success: false, message: e.message };
  }
});

// --- IPC: Auth Reset Password ---
ipcMain.handle('auth:reset-password', async (event, { email }) => {
  console.log(`[Electron Main] Reset password for: ${email}`);
  if (!supabaseAdmin) return { success: false, message: 'Server misconfigured: No Admin Client.' };

  try {
    const { data: settings, error: settingsError } = await supabaseAdmin.from('system_settings').select('*').limit(1).maybeSingle();
    if (settingsError || !settings) return { success: false, message: 'Failed to fetch settings.' };

    const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings;
    if (!smtp_host || !smtp_user || !smtp_pass) return { success: false, message: 'SMTP settings incomplete.' };

    // Generate Link (Electron app usually uses deep linking, but here we might just point to the site or specific schema)
    // For simplicity, we point to the same URL strategy as web, or a local file if needed.
    // Assuming the app has a web counterpart or handles https: links.
    // If it's a pure offline app it might be tricky, but assuming VITE_DEV_SERVER_URL or hosted URL.
    const origin = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo: `${origin}/?reset=true` }
    });
    if (linkError) throw linkError;

    const recoveryLink = linkData.properties.action_link;

    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: Number(smtp_port) || 587,
      secure: Number(smtp_port) === 465,
      auth: { user: smtp_user, pass: smtp_pass },
      tls: { rejectUnauthorized: false }
    });

    const mailText = `親愛的會員您好，\n\n我們收到了您重設密碼的請求。\n請點擊下方連結以重設您的密碼：\n\n${recoveryLink}\n\n若您未發出此請求，請忽略此信件。\n\n--\nAI Property Appraiser`;

    await transporter.sendMail({
      from: `"AI Property Appraiser" <${smtp_user}>`,
      to: email,
      subject: '[AI房產估價師] 重設密碼通知',
      text: mailText
    });

    return { success: true, message: 'Password reset email sent.' };
  } catch (e) {
    console.error('[Electron Main] Reset error:', e);
    return { success: false, message: e.message };
  }
});