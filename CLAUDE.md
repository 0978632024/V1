# Agent 規則（A / B 本機用）

## 🚫 絕對不可以（優先於本檔所有其他規則）

1. **不要推到 GitLab。** 公司 GitLab 是唯讀的，這個專案跟它無關。
2. **不要發佈到 claude.ai。** 不做 Artifact、不上傳、不產生分享連結 ——
   **提案簡報（ppt / deck）尤其不可以。**
3. 唯一允許的遠端是 **GitHub `a96020183/buildmode2026`（private）**。
4. 要交給 三人組看的東西，只走兩條路：`docs/`（GitHub Pages，見下）或 Google 表單。
   不要用其他任何對外發佈方式。

## ⚠️ `docs/` 是公開的

`docs/` 由 GitHub Pages 發佈到 `https://a96020183.github.io/buildmode2026/`，
**任何人拿到網址都看得到**（Pro 方案沒辦法讓 Pages 也變 private）。

- `docs/` 只准放兩樣東西：
  1. `index.html` —— 給 三人組看的交件指南
  2. `board.html` + `board-status.js` —— **清洗過的**對外看板，
     由 `dashboard\build-status.ps1 -Public` 產生，不要手改
- **絕對不要**把 `deck/`、`demo/`、`research/`、`pending/` 的任何內容複製或連結進 `docs/`
- **對外看板的清洗不可以拿掉**：`Write-PublicStatus` 會把 commit 訊息換成通用字眼、
  清空 activity feed、移除待審批與 A 級數。要改看板功能時務必確認這三件事還在做。
- `docs/.nojekyll` 不要刪 —— 它擋掉 Jekyll，避免多餘的檔案被轉成網頁

repo 其他部分是 private，只有 `docs/` 例外。

違反上面任一條之前先停下來問人。

## 硬規則

1. **絕不直接寫 `deck/` 與 `demo/`。** 整理 `inbox/` 的產出一律寫進 `pending/`。
2. 從 `pending/` 移進 `deck/`、`research/`、`demo-assets/`，只在人明確說「approve `<檔名>`」時做。
3. **每次動 `deck/` 或 `demo/` 之前先 `git commit` 現況。**
4. 不要重構沒被要求的東西。不要「順手」整理格式、改檔名、合併檔案。
5. `.env`、任何 API key / token 一律不進 git。看到就停下來講。

## intake 流程（人說「整理 inbox」時）

對 `inbox/` 每個還沒處理的檔案：

1. 讀開頭三行（這是什麼 / 放提案哪一節 / 資料來源）。
   - **缺 → 產出 `pending/_退回_<原檔名>.md`，寫明缺什麼。不要自己幫他補。**
2. 齊全 → 整理成提案可用的段落，輸出 `pending/<節次>-<主題>.md`。
   開頭保留那三行，再加一行 `原始檔：inbox/<檔名>`。
3. **標出無來源的斷言。** 三人組用 ChatGPT / Gemini 生的內容常有「看起來像事實但沒有出處」的句子。
   在那一行後面加 `<!-- 無來源，需確認 -->`。**不要幫它圓、不要自己去查來補。**
4. **不要合併不同人的檔案。** 一份進、一份出，維持可追溯。
5. 處理完在 `pending/_intake-log.md` 加一行：`日期 | 原始檔 | 產出檔 | 退回原因（若有）`。

## approve 流程（人說「approve X」時）

1. 先 `git commit` 現況。
2. 把 `pending/X` 移到目標目錄。
3. 只做必要的接縫調整（標題層級、與前後節的銜接）。**不要重寫內容。**
4. 回報一句：移到哪、動了哪幾行。

## 這份規則是軟的

你（agent）有可能不遵守。**真正的保險是第 3 條的 git commit** —— 只要有 commit，任何越界都能 revert。
所以第 3 條優先於其他所有條。
