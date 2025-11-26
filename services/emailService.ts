
export interface EmailPayload {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  to: string;
  cc?: string;
  subject: string;
  text: string;
}

// 擴充 Window 介面以識別 Electron API
declare global {
  interface Window {
    electronAPI?: {
      sendEmail: (payload: EmailPayload) => Promise<{ success: boolean; message?: string; messageId?: string }>;
    };
  }
}

export const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean; error?: string }> => {
  console.log(`[EmailService] 準備發送郵件給: ${payload.to} (副本: ${payload.cc || '無'})`);

  // 1. 優先檢查是否為 Electron 環境 (打包後的 .exe 或 electron 開發模式)
  if (window.electronAPI) {
    try {
      console.log('[EmailService] 偵測到 Electron 環境，使用 IPC 通道發信...');
      const result = await window.electronAPI.sendEmail(payload);
      
      if (result.success) {
        console.log('[EmailService] Electron 發信成功');
        return { success: true };
      } else {
        console.error('[EmailService] Electron 發信失敗:', result.message);
        return { success: false, error: result.message || 'Electron 發送失敗' };
      }
    } catch (err) {
      console.error('[EmailService] IPC 通訊錯誤:', err);
      return { success: false, error: err instanceof Error ? err.message : 'IPC 通訊錯誤' };
    }
  }

  // 2. 網頁模式 (本地開發或線上部署)
  // 使用相對路徑 '/api/send-email'。
  // - 本地開發時：vite.config.ts 的 proxy 會將其轉發到 http://localhost:3000/api/send-email
  // - 線上部署(Vercel)時：會自動對應到 api/send-email.js Serverless Function
  try {
    console.log('[EmailService] 未偵測到 Electron，嘗試連接 Web API...');
    
    // 使用相對路徑，讓瀏覽器自動判斷 Domain
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        // 嘗試解析 JSON 錯誤訊息
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || `Server responded with ${response.status}`);
        } catch (e) {
            throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
    }

    const data = await response.json();
    if (data.success) {
      console.log('[EmailService] Server 發信成功');
      return { success: true };
    } else {
      console.error('[EmailService] Server 回傳錯誤:', data.message);
      return { success: false, error: data.message || 'Server 發送失敗' };
    }
  } catch (err) {
    console.error('[EmailService] 連線失敗:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : '無法連接後端伺服器。' 
    };
  }
};
