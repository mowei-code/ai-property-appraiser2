
# AI 房產估價師 - 網站部署指南 (Vercel)

本文件說明如何將此應用程式發布到網路上，讓其他人透過瀏覽器即可使用。

我們推薦使用 **Vercel**，因為它對 React 應用程式的支援最好，且可以免費託管我們的「郵件發送後端 (API)」。

---

## 前置準備

1.  確保您有一個 **GitHub** 帳號。
2.  確保您有一個 **Vercel** 帳號 (可使用 GitHub 登入)。
3.  您的專案程式碼已經上傳到 GitHub Repository。

---

## 部署步驟

### 1. 上傳程式碼到 GitHub

**A. 初始化本地 Git (如果您尚未執行)**
在專案根目錄開啟終端機，執行以下指令：
```bash
git init
git add .
git commit -m "Initial commit"
```

**B. 建立 GitHub 遠端倉庫 (Repository)**
1.  登入 [GitHub](https://github.com) 網站。
2.  點擊頁面右上角的 **「+」** 號，選擇 **「New repository」**。
3.  在 **Repository name** 欄位輸入專案名稱 (例如 `ai-property-appraiser`)。
4.  選擇 **Public** (公開) 或 **Private** (私人) 皆可。
5.  **重要**：請勿勾選 "Add a README file" 或其他初始化選項 (因為我們本地已經有檔案了)。
6.  點擊綠色的 **「Create repository」** 按鈕。

**C. 推送程式碼 (Push)**
建立完成後，在 GitHub 頁面上找到 **"…or push an existing repository from the command line"** 的區塊，複製該區塊的指令，並在您的終端機執行：

```bash
# 請將下方的 URL 替換為您剛剛在 GitHub 頁面上看到的網址
git remote add origin https://github.com/您的帳號/ai-property-appraiser.git

# 確保分支名稱為 main
git branch -M main

# 將程式碼推送到 GitHub
git push -u origin main
```

### 2. 在 Vercel 匯入專案
1.  前往 [Vercel Dashboard](https://vercel.com/dashboard)。
2.  點擊 **"Add New..."** -> **"Project"**。
3.  在 "Import Git Repository" 列表中，找到您剛剛上傳的 `ai-property-appraiser` 專案，點擊 **"Import"**。

### 3. 設定專案 (重要)
Vercel 會自動偵測這是 Vite 專案，大部分設定保持預設即可。

*   **Framework Preset**: Vite
*   **Root Directory**: `./` (預設)
*   **Build Command**: `npm run build` (預設)
*   **Output Directory**: `dist` (預設)
*   **Install Command**: `npm install` (預設)

**環境變數 (Environment Variables):**
本專案的 API Key 是由使用者在前端輸入並儲存在瀏覽器，因此**不需要**在 Vercel 後台設定 `API_KEY`。

### 4. 開始部署
點擊 **"Deploy"** 按鈕。
等待約 1-2 分鐘，Vercel 會自動安裝套件、建置網頁並部署 API。

### 5. 完成！
部署完成後，Vercel 會提供一個網址 (例如 `https://ai-property-appraiser.vercel.app`)。
您可以將此連結分享給朋友，他們即可在電腦或手機瀏覽器上使用本應用程式！

---

## 功能驗證

網站上線後，請測試以下功能是否正常：

1.  **前端頁面**：是否能正常瀏覽、操作地圖。
2.  **AI 估價**：前往「設定」，輸入您的 Gemini API Key，測試估價功能。
3.  **郵件通知 (Backend API)**：
    *   使用管理員帳號登入 (`admin@mazylab.com` / `admin123`)。
    *   進入「管理後台」 -> 「系統設定」。
    *   設定您的 SMTP 資訊 (例如 Gmail App Password)。
    *   嘗試建立新用戶或觸發會寄信的功能。
    *   *注意：我們已經為您準備了 `api/send-email.js`，這會在 Vercel 上自動轉為 Serverless Function，確保發信功能在網頁版也能運作。*

---

## 常見問題

*   **Q: 為什麼網頁版不能像桌面版一樣直接讀取檔案？**
    *   A: 網頁版受限於瀏覽器安全性，無法直接讀取使用者電腦的檔案系統，因此「匯入 CSV」功能需要使用者手動選擇檔案。

*   **Q: 為什麼 Vercel 上 `server.js` 沒有執行？**
    *   A: Vercel 是 Serverless 架構，不會一直執行 `server.js`。我們已經新增了 `api/send-email.js` 來取代它，功能完全相同。
