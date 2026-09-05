# 給 B 的上手指令（貼進 Codex）

把下面 `---` 之間的整段複製給 B，讓他貼進 Codex 就好。
他跑完會自己知道要做什麼，不需要你口頭轉述。

---

我要加入一個 hackathon 專案，幫我 clone 下來並設定好。

```
git clone https://github.com/a96020183/buildmode2026.git
cd buildmode2026
git config user.name "0978632024"
git config user.email "lint96409@gmail.com"
```

第三、四行**要照抄**（那是我的 GitHub username 和 email）。專案裡有個戰情看板靠
`git log` 的作者名分辨隊員，名字對不上的話我的工作會算到別人頭上 —— 就算你已經
設過 global 的 user.name，也要在這個 repo 再設一次覆蓋掉。

第四行不設的話 git 會直接拒絕 commit。

驗證：`git config user.name` 印出 `0978632024` 就對了。

接著讀 `README.md`、`CLAUDE.md`、`KICKOFF.md`、`dashboard/README.md`，
跟我摘要四件事：

1. 我（B）負責哪些目錄、哪些絕對不能碰
2. 第一天題目公布後，我要做的前 30 分鐘是什麼（我那天是一個人，A 不在）
3. 審批流程怎麼走 —— 我一個人可不可以直接放行
4. 有哪三類決定我必須留紀錄

**這個專案有三條硬規則，你（Codex）也要遵守：**

- **不要推到 GitLab**（含 gitlab-studio.cmoney.tw）
- **不要發佈到 claude.ai 或任何對外平台**，提案簡報尤其不可以
- 唯一允許的遠端是 GitHub `a96020183/buildmode2026`（private）；
  唯一公開的目錄是 `docs/`，不要把 `deck/`、`demo/`、`research/` 的內容搬進去

`CLAUDE.md` 開頭寫的規則對你同樣適用，特別是「絕不直接寫 `deck/` 和 `demo/`，
整理進來的東西一律先進 `pending/` 等審批」以及「動 `deck/`、`demo/` 之前先 commit」。

---

## B 怎麼收三人組的交件

交件檔由 Apps Script 直接 commit 進 repo，所以 B **不用裝 Google Drive for Desktop、
也不用被分享任何資料夾**：

```powershell
.\sync-inbox.ps1
```

就是 `git pull` 再列出這次多了哪幾份。然後跟 Codex 說「整理 inbox」，規則在 `CLAUDE.md`。

## B 看看板的話

```powershell
.\dashboard\build-status.ps1
```

然後雙擊 `dashboard\index.html`。他自己的 commit 會讓他那隻 PiPi 動起來。
