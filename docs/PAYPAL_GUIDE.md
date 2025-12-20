# PayPal 支付串接設定指南

本文件說明如何取得 PayPal Client ID 並將其設定至「AI 房產估價師」應用程式中，以啟用會員訂閱付款功能。

## 第一步：取得 PayPal Client ID

要使用 PayPal 收款，您需要一個 PayPal 商業帳戶並建立一個應用程式 (App) 來取得憑證。

1.  **登入 PayPal Developer Dashboard**
    *   前往 [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications)。
    *   使用您的 PayPal 商業帳號登入。

2.  **建立應用程式 (Create App)**
    *   在 "My Apps & Credentials" 頁面中，您會看到 **Sandbox** (測試環境) 和 **Live** (正式環境) 的切換按鈕。
    *   **建議先使用 Sandbox 進行測試**：確認切換到 "Sandbox"。
    *   點擊 **"Create App"** 按鈕。
    *   輸入 App Name (例如：`AI Property Appraiser`)。
    *   點擊 **"Create App"**。

3.  **複製 Client ID**
    *   建立成功後，您會進入該 App 的詳細資訊頁面。
    *   找到 **"Client ID"** 欄位。
    *   複製那一長串字串，這就是您需要的金鑰。

    > **注意**：Sandbox 的 Client ID 只能用於測試（使用 PayPal 提供的測試信用卡或測試帳號）。正式上線收錢時，請切換到 **Live** 分頁，重複上述步驟建立正式 App 並取得 Live Client ID。

---

## 第二步：在應用程式中設定

1.  **以管理員身分登入 App**
    *   開啟「AI 房產估價師」應用程式。
    *   使用管理員帳號登入 (預設為 `admin@mazylab.com` / `admin123`，或您自行建立的)。

2.  **進入管理後台**
    *   點擊右上角的管理員圖示（紫色盾牌），進入 **「管理後台」 (Admin Panel)**。

3.  **輸入 Client ID**
    *   在左側的 **「系統設定」 (System Configuration)** 區塊中。
    *   找到 **"PayPal Client ID"** 輸入框。
    *   貼上您剛剛複製的 Client ID。
    *   點擊 **「儲存系統設定」 (Save Configuration)**。
    *   系統會顯示「設定已儲存」。

---

## 第三步：使用者付款體驗 (測試)

設定完成後，一般會員即可看到付款選項。

1.  **以一般會員身分登入**。
2.  點擊右上角的 **「設定」 (Settings)** 圖示。
3.  在設定視窗上方，會看到 **「升級您的帳戶」** 區塊。
4.  選擇方案（一個月、半年或一年）。
5.  點擊 **「使用 PayPal 升級」**。
6.  系統會顯示 PayPal 支付按鈕 (PayPal, Debit or Credit Card)。
7.  **付款流程**：
    *   使用者完成付款後，PayPal 視窗會自動關閉。
    *   App 會顯示「升級成功！您現在是付費會員了」。
    *   該用戶的角色會立即更新為「付費用戶」，並自動計算到期日。

---

## 常見問題 (FAQ)

*   **Q: 為什麼付款按鈕沒有出現？**
    *   A: 請確認管理後台的 Client ID 是否已正確輸入並儲存。如果欄位是空的，付款按鈕會被隱藏並顯示提示訊息。

*   **Q: 如何切換成正式收費？**
    *   A: 請到 PayPal Developer Dashboard 切換到 **"Live"** 模式，複製 Live Client ID，並更新到 App 的管理後台即可。

*   **Q: 付款失敗怎麼辦？**
    *   A: 檢查 Client ID 是否正確。如果是 Sandbox ID，請確保您使用的是 Sandbox 測試帳號付款，而不是真實信用卡。
