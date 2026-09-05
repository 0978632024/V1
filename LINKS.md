# 網址總表

建立於 2026-09-04。忘記的時候在 Apps Script 跑 `showConfig()` 也會重印一次。

## 交件

| | 網址 | 給誰 |
|---|---|---|
| **填答表單** | https://docs.google.com/forms/d/e/1FAIpQLScT02fzkhoRSqfGVzx1ZgH7Zjsagnpq6f0MePyg1s6RHQ9MrQ/viewform | **星語 / 小恩 / 阿崴** |
| 編輯表單 | https://docs.google.com/forms/d/19sEkeaZdVz6vWSFFahsn6in5BU6Y0Kv775v7EOr4b-0/edit | A / B |
| 回覆試算表 | https://docs.google.com/spreadsheets/d/1aFBBJh6FLMTuJANHyigoFpkk24-qf_-A0bsIjjY_TRU/edit | A / B |
| 交件檔案資料夾 | https://drive.google.com/drive/folders/1ywXXVy14C7gsY5_oeIew80571avnSADb | A / B 各自鏡像 |

`FOLDER_ID = 1ywXXVy14C7gsY5_oeIew80571avnSADb`

表單已驗證：4 頁、依「交件類型」分流、第 1 區五題全部必填、正在接受回覆。

## 程式

| | 網址 | 誰看得到 |
|---|---|---|
| GitHub repo | https://github.com/a96020183/buildmode2026 | private，只有 A / B |
| **交件指南（GitHub Pages）** | https://a96020183.github.io/buildmode2026/ | **公開，任何人** |

✅ 2026-09-04 已實測驗證：
- `https://a96020183.github.io/buildmode2026/` → 正常，表單按鈕連到正確網址
- `.../README.md` → 404
- `.../deck/OUTLINE.md` → 404

⚠️ Pages 只發佈 `docs/` 這個資料夾，裡面只有交件指南一頁。
**`deck/`、`demo/`、`research/` 都不在發佈範圍，也絕對不要搬進去** —— Pro 方案沒辦法讓 Pages 變 private。


## Demo

| | 網址 | 誰看得到 |
|---|---|---|
| 語音引導 demo（機台測試 R1/R2 用） | https://a96020183.github.io/taska-voice-demo/ | 公開（repo：a96020183/taska-voice-demo） |
| 3S 無障礙空間資訊 demo（WebGIS：視障人口熱區、公平性缺口、無障礙路徑） | https://ken-chui.vercel.app/yao-3s-demo/ | 公開（A 的 Vercel） |

⚠️ 這個 demo repo 是公開的 —— 只放引導層，NFC 資料結構與介接細節不進去（專利揭露紀律）。
之後會改版（可能改成模擬手機畫面版）。

## 通知寄給誰

`a96020183@gmail.com`、`lint96409@gmail.com` —— 設定在 Apps Script 的 `CFG.NOTIFY_EMAILS`。
改這個不用重跑 `setup()`，存檔就生效。

✅ 2026-09-04 `testOnce()` 實測：**兩個信箱都收到通知**。
所以「Day 1 A 不在、B 一個人也收得到」已經驗證過，不是假設。

## 還沒填的

- `sync-inbox.ps1` 的 `$Src` ← 等裝好 Google Drive for Desktop、把「交件檔案」設成鏡像後，
  把本機路徑用 `.\set-form-url.ps1 -FormUrl "<填答網址>" -InboxPath "<本機路徑>"` 填進去
