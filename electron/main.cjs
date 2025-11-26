const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const nodemailer = require('nodemailer');

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