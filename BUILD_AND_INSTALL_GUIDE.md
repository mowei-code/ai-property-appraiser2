
# AI 房產估價師 - Windows 安裝檔製作指南

本文件詳細說明如何將此專案打包為 Windows `.exe` 安裝檔，以便分發給其他使用者安裝使用。

## 📦 製作步驟 (Step-by-Step)

請依照以下順序操作，以確保打包成功。

### 1. 清除舊檔案 (Clean)
為了避免舊的錯誤檔案干擾，建議每次正式打包前先清理。
*   請手動刪除專案目錄下的 **`dist`** 資料夾。
*   請手動刪除專案目錄下的 **`dist_electron`** 資料夾。

### 2. 開啟終端機 (Terminal)
建議使用 **「以系統管理員身分執行」** 的 CMD 或 PowerShell，以避免 Windows 權限錯誤。
```bash
cd /d "您的專案路徑"
```

### 3. 安裝依賴 (Install)
確保所有套件都已正確下載。
```bash
npm install
```

### 4. 執行打包 (Build)
執行以下指令開始製作安裝檔：
```bash
npm run electron:build
```
*   **過程說明**：此指令會依序執行 `vite build` (編譯網頁) 和 `electron-builder` (製作 exe)。
*   **等待時間**：首次打包需下載 Electron 核心與 NSIS 工具，可能需要 3-5 分鐘，請耐心等待直到出現 `Done`。

---

## 📂 檔案輸出位置

打包完成後，請前往專案資料夾內的 **`dist_electron`** 資料夾。您會看到以下檔案：

1.  **`AI房產估價師 Setup 1.1.19.exe`** (版本號可能不同)
    *   **用途**：這是標準安裝檔。
    *   **行為**：雙擊後會自動安裝到使用者的電腦，並在桌面建立捷徑。
    *   **✅ 推薦**：請將此檔案提供給一般使用者。

2.  **`AI房產估價師 Portable 1.1.19.exe`**
    *   **用途**：免安裝版。
    *   **行為**：雙擊後直接執行，不會安裝到系統，也不會建立捷徑。
    *   **✅ 推薦**：適合放在隨身碟攜帶使用。

---

## ❓ 常見問題排除 (Troubleshooting)

### Q1: 執行時出現 `'vite' 不是內部或外部命令`？
**A:** 代表 `npm install` 未成功執行。請重新執行 `npm install`。

### Q2: 打包時出現 `ERROR: Cannot create symbolic link`？
**A:** 這是 Windows 權限不足。請關閉終端機，重新以 **「系統管理員身分」** 開啟，再執行打包指令。

### Q3: 安裝檔打開後被 Windows Defender 阻擋？
**A:** 出現「Windows 已保護您的電腦」藍色視窗是正常的。
*   原因：我們的應用程式沒有購買微軟的數位簽章憑證（Code Signing Certificate）。
*   解法：請點擊 **「其他資訊」 (More info)** -> **「仍要執行」 (Run anyway)**。

### Q4: 朋友安裝後說「找不到 ffmpeg.dll」？
**A:** 這通常是因為他們沒有使用安裝檔 (`Setup.exe`)，而是錯誤地複製了 `win-unpacked` 資料夾裡的檔案。
*   請確認您傳給他們的是 **`dist_electron`** 資料夾內的 **`.exe`** 檔案。

### Q5: 為什麼關於頁面的日期沒有更新？
**A:** 發布日期是在執行 `npm run electron:build` 時自動生成的。請確保您已經重新執行了打包指令。
