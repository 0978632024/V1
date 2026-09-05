# 交接文件 · 換 PC

寫於 2026-09-04。**全部已推上 GitHub，舊機器可以直接關機。**

> 這份是「換機時看的」。日常流程看 [README.md](README.md)，題目公布後看 [KICKOFF.md](KICKOFF.md)。

---

## 1. 三分鐘把新機器接上

```powershell
# 裝 git（沒裝的話）→ https://git-scm.com/download/win，一路 Next

git clone https://github.com/a96020183/buildmode2026.git
cd buildmode2026

git config user.name "a96020183"
git config user.email "135975584+a96020183@users.noreply.github.com"
```

**第 3 行不能跳。** 戰情看板靠 `git log` 的作者名分辨隊員；名字不對，你的 commit 會
算不到你頭上，你的 PiPi 永遠是灰的。（對照表在 `dashboard/build-status.ps1` 的 `$PEOPLE`。）

驗證：`git config user.name` 印出 `a96020183`。

第一次 `git push` 會跳瀏覽器登入 GitHub，登完就記住。

### 確認接上了

```powershell
.\sync-inbox.ps1                 # 就是 git pull，會列出現有交件
.\dashboard\build-status.ps1     # 產生看板資料
```

然後雙擊 `dashboard\index.html`。你的 PiPi（**指揮家學長**）應該是彩色的。

---

## 2. 新機器上第一次跟 Claude 講的話

新的 Claude session 沒有任何上下文。開在 `buildmode2026` 目錄下，貼這段：

```
我是 A（指揮家學長），BUILDMODE GEN-AI HACKATHON 2026 的隊長。
我剛換了新電腦，這個 repo 是我們的協作骨架。

先讀 HANDOFF.md、README.md、CLAUDE.md，然後跟我確認三件事：
1. 現在還沒做完的是什麼
2. 我這台新機器還缺什麼設定
3. CLAUDE.md 開頭那三條紅線是什麼

⚠️ 這個專案有三條硬規則，你也要遵守：不要推 GitLab、不要發佈到 claude.ai
（提案簡報尤其不可以）、唯一遠端是 GitHub a96020183/buildmode2026（private），
唯一公開的目錄是 docs/。
```

---

## 3. 不用做的事

| | 為什麼 |
|---|---|
| ❌ 裝 Google Drive for Desktop | 交件走 GitHub，不走 Drive 同步 |
| ❌ 重建 Google 表單 / Apps Script | 都在雲端，跟機器無關 |
| ❌ 重開 GitHub token | 存在 Apps Script 的指令碼屬性裡，不在你的 PC 上 |
| ❌ 填任何路徑 | `sync-inbox.ps1` 就是 `git pull` |
| ❌ 裝 Node / Python | 看板腳本是純 PowerShell |
| ❌ 從舊機器搬任何檔案 | 唯一沒進 git 的是 `dashboard/status.js`，跑腳本會重新產生 |

---

## 4. 現在的狀態

**34 個 commit、33 個檔案，工作區乾淨、沒有未推的東西。**

| 環節 | 狀態 |
|---|---|
| 五人流程、審批規則、B 單飛規則 | ✅ |
| KICKOFF 前 30 分鐘 SOP（Day 1 A 不在） | ✅ |
| Google 表單（4 區段、分流、必填） | ✅ 實測 |
| 通知寄到 A + B 兩個信箱 | ✅ `testOnce` 實測，兩邊都收到 |
| 交件檔自動 commit 進 `inbox/` | ✅ 實測，`0904-2205_測試_QA_回報.md` 就是那筆 |
| 交件指南上線、確認沒外洩 | ✅ `README.md`、`deck/` 都是 404 |
| 戰情看板（五人 PiPi、對外版清洗） | ✅ |
| GitHub private + B 已加 collaborator | ✅ |

### 還沒做完的

1. **跑 `addOtherOptions()`** —— 表單兩題加「其他」。重貼
   `inbox\AppsScript-貼這個.gs` → Ctrl+S → 選那個函式 → 執行。
   **不用補 email**（已寫進檔案），`GITHUB_TOKEN` 和時區在專案設定裡也不會掉。
   ⚠️ 選單裡不要誤跑 `setup()` —— 會建出第二份表單，現在這份就作廢了。
2. **把交件指南網址給三人組** —— https://a96020183.github.io/buildmode2026/
3. **把 Codex 指令給 B** —— 見 [ONBOARD-B.md](ONBOARD-B.md)
4. **（選做）刪掉測試交件** —— `inbox/0904-2205_測試_QA_回報.md`
   現在被算進「今日交件 1 / A 級未修 1」。要留著當範例也可以。

---

## 5. 網址與帳號

網址總表在 [LINKS.md](LINKS.md)。最常用的四個：

| | |
|---|---|
| 交件指南（給三人組） | https://a96020183.github.io/buildmode2026/ |
| 對外戰情看板 | https://a96020183.github.io/buildmode2026/board.html |
| 表單編輯 | https://docs.google.com/forms/d/19sEkeaZdVz6vWSFFahsn6in5BU6Y0Kv775v7EOr4b-0/edit |
| Apps Script | https://script.google.com → 專案 **buildmode** |

**通知寄給**：`a96020183@gmail.com`、`lint96409@gmail.com`

### 秘密放在哪

| | 在哪 | 換機要重做嗎 |
|---|---|---|
| GitHub PAT（Apps Script 用來 commit） | Apps Script → 專案設定 → 指令碼屬性 `GITHUB_TOKEN` | 不用 |
| GitHub 登入（你 push 用） | 新機器的 Git Credential Manager | **要**，第一次 push 跳瀏覽器登入 |
| 表單 / 試算表 / Drive | Google 帳號 `a96020183@gmail.com` | 不用 |

**repo 裡沒有任何 token。** 別把 PAT 貼進 `.gs` 檔 —— 那個檔會被複製進 repo。

---

## 6. 五個人是誰

| 代號 | 名字 | 角色 | 權限 |
|---|---|---|---|
| A | 指揮家學長（你） | 揮棒收口・說了算 | push、審批 |
| B | 實務派LULU | 真的在寫 code 的人 | push、審批（**Day 1 全權**） |
| C | 過勞星語 | 研究＋QA＋文案 全包 | 只填表單 |
| D | 黑奴小恩 | 研究＋QA＋文案 全包 | 只填表單（他有 Codex，但不是決定者） |
| E | 佐佐木阿崴 | 點煙 | 只填表單 |

**審批：A 或 B 任一人同意就過。Day 1 你不在 → B 全權。**

三人組**不分工**，三個人都做全部三類交件。重複不是浪費 —— 三個人寫同一節，
你就有三個版本可以挑。

---

## 7. 每天怎麼用

```powershell
.\sync-inbox.ps1          # git pull，列出新交件
```

然後跟 Claude 說 **「整理 inbox」** → 它照 `CLAUDE.md` 的規則整理進 `pending/`，
**不會動 `deck/` 和 `demo/`**。

審批：跟 Claude 說 **「approve <pending 的檔名>」**。

活動期間想讓三人組看到看板動起來：

```powershell
.\dashboard\build-status.ps1 -Watch -Public -Push
```

掛著就好，每 10 分鐘更新。線上會落後 10–20 分鐘（GitHub Pages 的 CDN 快取），
情緒價值夠用，別當即時監控。

---

## 8. 舊機器關機前

```powershell
git status                    # 應該 clean
git log origin/main..HEAD     # 應該沒有輸出
```

兩個都乾淨就直接關。**2026-09-04 寫這份時已經確認過了。**
