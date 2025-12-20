import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const simulatorPath = path.join(__dirname, 'mobile-simulator.html');
const CONFIG = {
    windowWidth: 700,
    windowHeight: 1000
};

/**
 * 通用型行動端模擬器啟動腳本
 * 用法: node simulate-mobile.js
 */
console.log('\n--- 📱 通用型行動端模擬器 ---');
const defaultUrl = 'http://localhost:5173';
launch(defaultUrl);

function launch(url) {
    console.log(`\n🚀 啟動模擬器載入: ${url}`);

    // 將目標 URL 作為參數傳遞給模擬器 HTML，並加入時間戳記防止快取
    // 修正 Windows 路徑格式為 Chrome 偏好的正斜線
    const formattedPath = simulatorPath.replace(/\\/g, '/');
    const t = Date.now();
    const command = `start chrome --app="file:///${formattedPath}?url=${url}&t=${t}" --window-size=${CONFIG.windowWidth},${CONFIG.windowHeight}`;

    exec(command, (error) => {
        if (error) {
            console.error('啟動失敗，請確認是否已安裝 Chrome 瀏覽器。');
            console.error(error);
        } else {
            console.log('啟動成功！請在模擬器視窗中進行測試。');
        }
    });
}
