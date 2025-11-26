const { contextBridge, ipcRenderer } = require('electron');

// 建立與主進程的通訊橋樑 (IPC)
// 這段程式碼確保網頁前端可以呼叫 Electron 的後端功能
contextBridge.exposeInMainWorld('electronAPI', {
  sendEmail: (data) => ipcRenderer.invoke('send-email', data)
});