# 交件到本機 Claude 的整條路

回答兩個問題：**A/B 怎麼收到通知**、**資料怎麼進到 A/B 本機給 Claude 讀**。

一支 Apps Script 同時解掉兩個。

```
三人組填 Google Form
      │
      ▼
  onFormSubmit 觸發（掛在表單上）
      │
      ├──▶ ① commit 進 GitHub 的 inbox/          ← 主路
      │         │
      │         ▼
      │    A / B 在任何一台機器  git pull
      │         │
      │         ▼
      │    跟 Claude 說「整理 inbox」→ pending/ → 等審批
      │
      ├──▶ ② 同時落一份 .md 到 Drive             ← 備援，網頁看得到
      │
      └──▶ ③ 通知 A + B（Google Chat + email，附全文）
```

**為什麼走 GitHub 不走 Drive 同步：** A 會換 2–3 台 PC。走 Drive 的話每台都要裝
Google Drive for Desktop、登入、等首次同步跑完（10–20 分鐘）。走 GitHub 的話
新機器 `git clone` 完就有，B 也不用被分享 Drive 資料夾。


---

## ⚠️ 為什麼不用 Form 內建的「收到新回覆時通知我」

那個設定**只通知開啟它的那一個帳號**。A 開了，B 不會收到；B 要自己登入再開一次。
三天活動裡這種「以為對方也收到了」的漏接最貴 —— 尤其 Day 1 只有 B 在。

所以通知改成由 Apps Script 主動寄給 `CFG.NOTIFY_EMAILS` 裡的**兩個地址**，
外加一份 Google Chat（手機看得最快）。誰都不需要「記得去開設定」。

---

## 設定步驟（一次性，約 10 分鐘）

表單不用手建，`SetupForm.gs` 的 `setup()` 會把資料夾、表單、試算表、觸發器全部建好。

### 1. 開一個 Apps Script 專案

[script.google.com](https://script.google.com) → 新專案 → 建兩個檔，各自貼進去：

| 檔名 | 貼什麼 |
|---|---|
| `FormIntake.gs` | 本資料夾的 `FormIntake.gs` |
| `SetupForm.gs` | 本資料夾的 `SetupForm.gs` |

（兩個檔在同一個專案裡共用全域變數，缺一不可。）

### 2. 改設定

`CFG.NOTIFY_EMAILS` 放 **A 和 B 兩個 email**。要 Chat 通知就填 `CHAT_WEBHOOK`。

專案設定 → 時區設成 `(GMT+08:00) 台北`。

### 3. 開 GitHub token 並存進指令碼屬性

**token 絕對不要寫進 .gs 檔** —— 那個檔會被複製、貼進 repo。

1. 開 https://github.com/settings/personal-access-tokens/new
2. **Token name**：`buildmode-intake`
3. **Expiration**：設到活動結束之後（例：30 天）
4. **Repository access** → `Only select repositories` → 勾 **buildmode2026**
5. **Permissions** → Repository permissions → **Contents** 改成 **Read and write**
6. Generate → **複製那串（只會顯示一次）**
7. 回 Apps Script → 專案設定 → 指令碼屬性 → 新增：
   - 屬性 `GITHUB_TOKEN`
   - 值：剛剛那串

權限只給這一個 private repo 的檔案讀寫，拿不到你其他 repo。

### 4. 跑 setup()

函式下拉選 **`setup`** → 執行 → 授權（Drive + 表單 + 寄信 + 外部連線）。

會印出四個網址。忘記的話隨時跑 `showConfig()`。

### 5. 驗證兩件事

先選 **`testGitHub`** 執行 —— 確認 token 通、而且有 push 權限。
它會直接告訴你哪裡不對（401 token 無效 / 404 沒授權給這個 repo / 沒有 push 權限）。

再選 **`testOnce`** 執行 —— 送一筆假交件，走完整條路。確認：

- GitHub 的 `inbox/` 多一個 `MMdd-HHmm_測試_QA 回報.md`（去 repo 看，或本機 `git pull`）
- Drive 的「交件檔案」資料夾也有同一份
- **A 和 B 兩個信箱都收到信**，信裡會寫 GitHub 推送成功或失敗

### 6. Google Drive for Desktop —— 不用裝

走 GitHub 之後這步不需要了。Apps Script 還是會落一份到 Drive 當備援，
用瀏覽器就看得到。

只有在 GitHub token 掛掉、又急著要檔案時才需要：裝 Drive for Desktop、
把「交件檔案」設成「鏡像」，然後 `.\sync-inbox.ps1 -Src "<本機路徑>"`。

### 7. 補一題檔案上傳（選做）

Apps Script **建不了「檔案上傳」題型**，這是 API 限制。所以 `setup()` 用「貼連結」的
替代題代替。要真的檔案上傳的話，去②編輯網址手動加一題，兩下就好。

不加也能跑 —— 三人組截圖貼群組、在表單寫「已貼群組」也行，而且省掉「填答者必須登入
Google 帳號」這個限制。

## 每天怎麼用

```powershell
.\sync-inbox.ps1
```

就是 `git pull` 再列出這次多了哪幾份，然後跟 Claude 說一句：

> 整理 inbox

Claude 照 `../CLAUDE.md` 的 intake 規則做：讀開頭三行、缺的標退回、無來源的斷言標記
`<!-- 無來源，需確認 -->`、輸出到 `pending/`。**不會動到 `deck/` 和 `demo/`。**

審批：

> approve `<pending 的檔名>`

---

## 踩雷清單

| 症狀 | 原因 | 怎麼修 |
|---|---|---|
| `setup()` 說找不到 `CFG` | 只貼了 `SetupForm.gs`，沒貼 `FormIntake.gs` | 兩個檔都要在同一個專案 |
| Drive 有落檔，但欄位都是「未填」 | 表單題目文字被改過 | 同步改 `FormIntake.gs` 的 `Q` |
| 不小心跑了兩次 `setup()` | 會建出第二份表單 | 去 Drive 把多的那份連同資料夾刪掉，重跑一次 |
| 只有 A 收到信 / 只有 B 收到 | `NOTIFY_EMAILS` 只放一個 | 兩個都放，存檔即可（不用重跑 `setup()`） |
| 完全沒落檔也沒信 | 觸發器沒裝或授權被撤 | 重跑 `setup()`，看執行紀錄 |
| 中間漏了幾筆 | 觸發器當掉過 | 跑 `backfillAll()` 補，同名會跳過 |
| 想在沒人交件時測 | — | 先 `testGitHub()` 再 `testOnce()` |
| 通知信寫「GitHub 推送失敗 401」 | token 無效或過期 | 重產一個，更新指令碼屬性 |
| 寫「失敗 404」 | fine-grained PAT 沒把這個 repo 加進 Repository access | 去 token 設定勾選 buildmode2026 |
| 寫「沒設 GITHUB_TOKEN，略過」 | 指令碼屬性沒建 | 專案設定 → 指令碼屬性 → 新增 GITHUB_TOKEN |
| GitHub 有檔但本機沒有 | 忘了 pull | 跑 `.\sync-inbox.ps1` |
| `git pull` 失敗 | 本機有未 commit 的改動起衝突 | `git status` 看一下，先處理再拉 |
| 檔名時間差 8 小時 | Apps Script 專案時區沒設 | 專案設定 → 時區 → 台北 |
| 寄信寄不出去 | MailApp 每日配額（個人帳號 100 封/天） | 三天幾十封不會到，但別拿它跑測試迴圈 |

---

## Plan B：不想碰 Apps Script

試算表 → 檔案 → 共用 → **發佈到網路** → 選 CSV，拿到一個網址。本機一行抓下來：

```powershell
curl.exe -sL "<CSV 網址>" -o inbox\_form.csv
```

再跟 Claude 說「把 `inbox/_form.csv` 裡還沒處理的列拆成 inbox/ 檔案，照 CLAUDE.md 的 intake 規則」。

**代價兩個，自己衡量：**
1. 「發佈到網路」= 任何拿到網址的人都看得到你的競品調查和提案內容。Hackathon 有對手，這不是零風險。
2. **沒有通知。** 得自己記得去抓 —— 這正是 Apps Script 要解掉的那件事。

急就章可以先這樣開跑，Day 1 晚上再補 Apps Script。
