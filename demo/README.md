# demo/

**A / B 專屬。三人組不進這裡。**

C 想改 demo 的任何地方 → 寫 QA 回報單（`inbox/templates/02-QA回報.md`），不要自己動手。

技術棧由 B 在 Day 1 前 30 分鐘直接定，寫進 `../DECISIONS.md` 一行。不要開會討論。

Day 1 結束前這裡要有「能跑、能截圖」的東西，假資料也算。

---

# TapThrough 手機版 Prototype · R2

本機可操作的校園文件機引導原型，使用繁體中文與原生 HTML。程式不連接學校、不處理真實款項、不儲存真實個資。以 `pending/02-round1-機台流程規格.md` 的實測路線與價目為準。

## 立即使用

開啟 `dist/index.html`，選「進入 Demo」。檔案內含全部樣式、程式與機台設定，不依賴 CDN、字型或圖片下載。適合電腦與支援執行本機 HTML 的瀏覽器離線備援。iOS「檔案」預覽可能不執行 JavaScript；iPhone 實測以 HTTPS 網頁先載入快取為主，務必事前切飛航模式實測。

Demo 模式請由陪同者展開「Demo controls · 僅供模擬」，在付款等待時按「模擬：付款完成」，文件處理時按「模擬：列印完成」。其他操作皆在主要畫面完成。

## 執行、建置與測試

需求：Node.js 18 以上。執行與建置零外部依賴，不需要安裝套件。終端機切到本資料夾：

```sh
node scripts/build.cjs
node scripts/serve.cjs
```

預覽：`http://127.0.0.1:4173/?machine=ntut-document-kiosk&demo=1`。伺服器只提供 `dist/index.html` 和 `dist/sw.js`，不會提供 private repo 的照片或文件。

```sh
node --test tests/model.test.cjs
```

有 npm 的環境亦可使用 `npm run build`、`npm start`、`npm test`。瀏覽器自動測試需額外安裝 Playwright 與 Microsoft Edge；另開終端機，在伺服器運作中執行：

```sh
node tests/browser.cjs
node tests/speech-browser.cjs
```

若 Playwright 在其他位置，可將套件資料夾路徑當作上述指令的第一個參數。瀏覽器測試使用本機 Edge headless；語音測試以替身驗證事件順序，不代表真實麥克風／iOS 播音已實測。

## 實測流程

已載入機台 → 中文 → 學生／校友 → 測試身分 → 認證中 → 中文成績名次證明書 → 1 份（20 元）→ 在校各學期系科所名次 → 114 學年度第 2 學期 → 確認 → 現金 → 等待付款 → 付款成功 → 處理文件 → 列印／取件 → 完成。

測試資料僅接受學號 `12345678`、生日 `20000101`，亦可按「使用 Demo 身分繼續」。不輸入真實個資。取件完成、重新開始或離開頁面時清除本次資料；只有機台尺寸以 V1 的 `taskA_measures` 名稱保存在本機。

價目包含規格中的 11 項；本次未實作的臨櫃／多工作天文件有明確標示，不能誤走成即時列印。名次類型 9 項、R2 學期與原價目依規格建置；另提供的 115-1 等學期是原型選项，不表示學校已開放申請。

## 12 畫面對應

規格的表格以照片號碼描述畫面，未提供獨立的 12 個 ID。本版按功能合併「資料處理」與「金額檢查」等等待画面，保留照片編號對應：

|畫面|機台名稱|規格照片編號|手機狀態|
|---|---|---|---|
|1|語言選擇|1|LANGUAGE|
|2|身分選擇|2|ROLE|
|3|輸入身分|3–4|AUTH|
|4|認證處理中|5|VERIFYING|
|5|申請項目與份數|6–7|SERVICE / COPIES|
|6|名次類型|8–9|RANK|
|7|學年期|10–11|SEMESTER|
|8|確認清單|12|REVIEW|
|9|付款方式與資料處理|13–14|PAYMENT_METHOD|
|10|投幣與金額檢查|15–19|PAYMENT_WAITING / PAYMENT_SUCCESS|
|11|列印與收據處理|20–23|PROCESSING / PRINTING|
|12|是否繼續申請|24|COMPLETED|

手機可多於 12 個操作步驟，例如文件和份數拆成兩頁，但機台進度仍顯示畫面 5。未需要名次／學期的文件會跳過相應畫面；進度數字代表機台位置而非百分比。

## 時間與錯誤

開始操作時以實際時間啟動 600 秒手機提醒；120、240、360、480 秒宣布剩餘時間。回到前景會重新計算，不依賴背景頁面持續執行。600 秒時呈現逾時、協助與重新開始，必須確認機台仍有效才能繼續。手機提醒不是實體機台倒數的同步資料，不能延長機台交易。

提供：未知機台、機台不可用、教職員未支援、付款失敗、付款逾時、辨識失敗、麥克風拒絕。協助按鈕顯示現場求助方式，不會真的發送通知。付款後不提供返回申請修改；重新開始前有確認，且不宣稱退款。

## Accessibility 與語音

原生 `button`、`form`、`fieldset`／`legend`、radio、label、heading、main、nav、dialog。每次換頁焦點移至 `h1[tabindex=-1]`；Dialog 支援 Escape 和還原焦點。狀態用持久 `aria-live=polite`，錯誤用 `role=alert`；表單錯誤連結 `aria-describedby`／`aria-invalid`，不把身分值塞進 live region。

Demo TTS 預設關閉，不偵測 VoiceOver。設定開啟才使用 `speechSynthesis`；手勢內先解鎖，`cancel()` 後等 150ms 再播，逐句排程並使舊排程失效。提供 zh-TW 優先選音、0.7–1.2 語速、重播與停止。敏感步驟 AUTH／VERIFYING／REVIEW 與隱私模式禁止 Demo TTS。隱私模式用 opacity 隱藏畫面像素，沒有以 `display:none` 或 `aria-hidden` 隱藏主操作內容。

語音學期輸入使用 `SpeechRecognition`／`webkitSpeechRecognition`、zh-TW、單次辨識。只在使用者按鈕後啟動；辨識結果必須按確認，從不直接付款。不支援、拒絕、無結果均保留學期按鈕。瀏覽器語音辨識可能使用其網路服務，離線是否可用取決於瀏覽器；完整按鈕流程不受影響。

## V1 保留與本輪優先規則

保留 A/B 切換、三個尺寸欄及儲存名稱、語速、重播、停止、黑屏、單檔離線和兩個 iOS 語音處理。尺寸比例轉換函式 `measuredCoordinate` 保留並測試，但 **所有引導距離始終是【待填】**，不將尺寸自動插入引導。現場填尺寸只會記錄數值；須由團隊確認後更新 JSON 腳本。

依使用者追加需求，Demo 現在預設開啟「直接滑動切換」：在內容區向左滑前進、向右滑返回，上下滑仍可捲動。每頁提示向左滑採用的選項；選擇頁預設沿 R2 路線（学生／校友、名次證明書、在校各學期系科所名次、114-2），份數使用目前所選值。仍可點選其他選項。付款與取件必須按畫面按鈕確認，等待狀態不會因滑動跳過。

此功能只在 `demo=1` 開啟。使用 VoiceOver／TalkBack 前，請在設定關閉「直接滑動切換」，以系統左右滑動／雙擊操作原生元件。不偵測讀屏，也不攔截多指、輸入欄或上下捲動。另有 `node tests/swipe-browser.cjs` 的瀏覽器觸控測試。

三句貼紙知識已寫入畫面與 TTS 腳本：勿投 1 元，機器會當機；先按現金，才能投幣；用悠遊卡的話，交易後記得拿出卡片。此機台本次付款方式只提供規格記載的現金，取卡句是現場安全提醒。

## 機台設定與 URL（此說明留在 private repo）

`src/machines.json` 集中管理機台、服務、價目、付款方法、12 畫面、實體動作與 A/B 腳本。新增機台以新的 machineId 建置設定，不把所有資料寫死於 UI。

- 無參數：等待連接，提供「進入 Demo」。
- `?machine=ntut-document-kiosk`：直接載入該機台並顯示已連接引導；不是已連上真實硬體。
- `?machine=ntut-document-kiosk&demo=1`：相同引導加獨立、預設收起的模擬控制。
- `?demo=1`：使用預設測試機台。
- 未知 ID：顯示錯誤與 Demo 入口。

NFC 標籤準備方式：把已部署的 HTTPS 機台網址寫成標籤的 URL／URI 記錄。手機碰標籤後直接開啟網址，本版不使用 Web NFC 掃描。標籤的資料結構、編碼規格與真實硬體介接不在本原型實作，也不得連同 private 文件公開。

## 付款／驗證替換位置

`src/model.js` 的 Session 統一處理狀態轉移與合法順序。PaymentAdapter 管理 `WAITING → PAID → PROCESSING` 或 `WAITING → FAILED`，UI 接收狀態事件。Demo controls 經 adapter 發送狀態，不是任意跳頁。

DemoAuthAdapter 目前只驗證固定測試值。未來驗證與付款來源可在 private repo 替換這兩個 adapter，保留 UI 與狀態模型。正式接入前仍須實作真實授權、狀態同步、付款識別及冪等性、機台逾時、列印回報、斷線恢復與端到端安全測試。本原型不含任何真實機台 API／WebSocket 介接細節。

沒有 `demo=1` 時以人工確認實體機台狀態繼續，不會自動宣称已收款。這是引導模式，不是正式連線模式。

## 部署範圍

本次未推送、未部署；private repo 的 `docs/` 未修改。團隊要部署時，先 build，再僅取 `dist/index.html` 與 `dist/sw.js` 放入允許的 demo hosting。建議 HTTPS，SpeechRecognition 與 Service Worker 依瀏覽器要求使用安全來源；localhost 可供本機測試。先線上載入至「離線快取已就緒」，再測飛航模式。

**不可把整個 private repo 當網站根目錄或公開**。不帶入照片、影片、pending、競賽文件、NFC 介接資訊。公開 demo 只包含重製的引導介面；發布前仍須由團隊檢查授權與公開範圍。

## 來源與授權

- 流程／價目：本 repo `pending/02-round1-機台流程規格.md`、`pending/03-demoV2-需求-給B.md`。
- V1 行為參考：`https://github.com/a96020183/taska-voice-demo/blob/main/index.html`，讀取時 blob `52cc51a706bb54078c310a64c573cb1a04ceb7f0`。保留功能與 iOS 實作策略；新介面依本輪要求重製。
- 不使用 round1 原圖、影片或其中個資；未根據未檢視影片宣稱語音時序已對齊。
- 未擅自指定既有內容的開源授權。若要公開 demo repo，團隊需確認並加入適用 LICENSE；本次 package 標為 private。

已完成與待實機驗證項目見 `ACCESSIBILITY_TEST.md`。
