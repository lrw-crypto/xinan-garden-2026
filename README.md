# 祈福小院
有心誠則靈，努力自有光。

Vite + TypeScript + Phaser 3 + Firebase Authentication / Realtime Database。庭院與人物皆以程式原創繪製，沒有外部圖像素材。匿名登入，不收集真實姓名、Email 或密碼。

## 本機開發
需要 Node.js 22+、Java 21（Firebase Emulator）。
```sh
npm ci --cache /tmp/npm-cache
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run dev
```
正式 Firebase 設定在 src/firebase.ts。資料庫鎖定時會明確顯示權限錯誤，不會以假人數冒充多人連線。
本機驗證可先執行：
```sh
npx firebase emulators:start --only auth,database --project demo-garden
VITE_EMULATORS=true npm run dev
```
Emulator 模式只連到本機 9099/9000，不寫入正式資料庫。禁止將 VITE_EMULATORS=true 用於正式建置。

## 雙人測試
1. 啟動 Emulator 與 Emulator 模式 Vite。
2. 用兩個獨立瀏覽器設定檔或一般與無痕視窗進入網站，各取不同暱稱。
3. 確認兩側皆顯示 2 位在線，互相點擊道路，觀察人物、暱稱、移動同步。
4. 一方進入靜心、祈福、長椅，另一方應看到狀態與固定表情。
5. 同時排隊，檢查順位、8 秒後輪替與祝福卡。
6. 寫私密願望，另一身分不得讀取；公開願望重新開啟面板可見。
7. 關閉其中一個視窗，等待 Firebase 偵測斷線，確認人數下降。中斷網路再恢復亦需測試。
8. 正式部署並套用規則後，用兩台不同手機重複以上步驟。正式站測試與 Emulator 測試須分別記錄。

`npm test` 會啟動 Auth / RTDB Emulator，測試安全規則及兩個獨立驗證身分透過真實 RTDB SDK 訂閱同步移動，不代表已驗證正式 Firebase 或真實手機。

## 發布安全規則（需您操作）
不會自動部署規則。先執行 npm test 通過後：
1. Firebase 控制台選擇 **xinan-garden-2026**。
2. Realtime Database → 新加坡資料庫 →「規則」。
3. 備份目前規則，貼入根目錄 database.rules.json 全部內容，按發布。
4. Authentication → Sign-in method 確認 Anonymous 啟用。
5. Authentication → Settings → Authorized domains 確認 lrw-crypto.github.io（開發需要時加入 localhost）。
6. 使用兩個瀏覽器驗證，並觀察資料庫用量。

規則預設拒絕根節點讀寫；驗證使用者可讀角色、公開願望、隊列；只有 UID 本人能寫角色與隊列、讀寫私密願望。欄位採白名單，限制暱稱、造型、色彩、座標、狀態、文字長度。公開文字有簡易不當用語過濾，**並非完整內容審核**；上線課堂需教師監督與處理不當內容。匿名使用者仍可建立多個身分；純前端不具反濫用、速率強制或完整管理機制。

## 補運隊列限制
以每 UID 的 transaction 建立伺服器時間戳，按時間與 UID 穩定排序，只能修改自己的紀錄，onDisconnect 清除。正常客戶端第一位停留 8 秒後離隊。規則拒絕回填過去時間或改寫他人紀錄；但無可信後端，無法保證惡意客戶端不提早宣稱完成、不佔住隊首、不建立多帳號，也無法伺服器強制完成輪替。勿宣稱不可插隊或具備完整公平性。人物移動每秒最多約 5 次更新。

## GitHub Pages
儲存庫 Settings → Pages → Source 選 GitHub Actions。
PR 執行安全規則測試、兩個獨立 Chromium 情境（桌面與手機寬度）的登入／互動測試與建置；合併 main 後 workflow 才部署。
預定網址：https://lrw-crypto.github.io/xinan-garden-2026/
Vite base 已設定 /xinan-garden-2026/。部署不包含 Firebase 規則。
雲端主機先完成本機測試，不會直接覆蓋 main。

## 檔案
- src/main.ts：登入、五項互動、連線、狀態與隊列
- src/garden.ts：Phaser 庭院繪圖、走路與角色渲染
- src/firebase.ts：Firebase 初始化、可選本機 Emulator
- src/fortunes.ts：12 主題 × 5 段原創鼓勵共 60 支籤
- src/style.css：手機與桌面版面
- database.rules.json：預設拒絕的 RTDB 規則
- tests/rules.test.mjs：允許、拒絕與雙用戶同步測試
- tests/browser.mjs：桌面與手機雙瀏覽器互動驗證
- tests/run-browser.mjs：自動啟停測試用 Vite 伺服器
- .github/workflows/pages.yml：測試、建置、Pages 發布

## 開發環境
既有 checkout 位於 /workspace/xinan-garden-2026，每個雲端任務已隔離，不需額外 worktree。
npm ci --cache /tmp/npm-cache 可避開受限的家目錄快取路徑。

瀏覽器整合測試：執行 npm run test:browser，會自動啟動 Emulator 與 5174 埠測試伺服器。需要已安裝 Chromium（本機 /usr/bin/chromium 或 Playwright Chromium）。CI 上傳 browser-results 截圖供檢查。此為 Chromium 模擬手機寬度，尚不代表真實 iPhone Safari 驗證。
