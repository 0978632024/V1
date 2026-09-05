# 換 PC 要做什麼

A 會在活動前後換 2–3 台機器。整條交件鏈已經改成走 GitHub，所以換機只有這幾步。

## 要做的（約 3 分鐘）

```powershell
# 1. 裝 git（沒裝的話）→ https://git-scm.com/download/win 一路 Next

# 2. 抓下來
git clone https://github.com/a96020183/buildmode2026.git
cd buildmode2026

# 3. 設身分 —— 這步不能跳
git config user.name "a96020183"
git config user.email "135975584+a96020183@users.noreply.github.com"
```

**第 3 步為什麼不能跳：** 戰情看板靠 `git log` 的作者名分辨隊員。名字不對的話你的
commit 會算不到你頭上，你的 PiPi 會一直是灰的。設定檔在 `dashboard/build-status.ps1`
的 `$PEOPLE`（A 的 `git` 欄位是 `a96020183`）。

沒加 `--global`，只影響這個 repo。

驗證：`git config user.name` 印出 `a96020183` 就對了。

## 第一次 push 會跳瀏覽器登入

Git Credential Manager 會開一個視窗要你登入 GitHub。登入授權完就記住了，之後不會再問。

## 不用做的

| | 為什麼 |
|---|---|
| ❌ 裝 Google Drive for Desktop | 交件走 GitHub，不走 Drive 同步 |
| ❌ 重建 Google 表單 | 表單和 Apps Script 都在雲端，跟機器無關 |
| ❌ 重開 GitHub token | token 存在 Apps Script 的指令碼屬性裡，不在你的 PC 上 |
| ❌ 填任何路徑 | `sync-inbox.ps1` 就是 `git pull`，沒有路徑要設 |
| ❌ 裝 Node / Python | 看板腳本是純 PowerShell |

要用 Claude Code 跟我一起工作的話，那個要另外裝 —— 但那跟這個專案無關。

## 換機後的第一次確認

```powershell
.\sync-inbox.ps1          # git pull，列出有哪些交件
.\dashboard\build-status.ps1
```

然後雙擊 `dashboard\index.html`。

**新 clone 的機器沒有 `dashboard/status.js`**（它有進 `.gitignore`，因為每台機器各自
產生、進 git 會讓 A 和 B 每次 pull 都衝突）。所以要先跑 `build-status.ps1` 才有資料 ——
沒跑就打開的話，看板會直接告訴你要跑什麼，不會給你一個白畫面。

## 舊機器上要留意的

沒有。所有東西都在 GitHub 上，`git status` 乾淨就可以直接關機。

真的要確認的話：

```powershell
git status              # 應該是 clean
git log origin/main..HEAD   # 應該沒有輸出（沒有未推的 commit）
```
