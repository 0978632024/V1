# BUILDMODE GEN-AI HACKATHON 2026 — 五人協作流程

**題目未定。這份骨架是題目無關的，題目公布後不需要改這頁。**

所有網址在 [LINKS.md](LINKS.md)。**換 PC 看 [HANDOFF.md](HANDOFF.md)。**

題目一公布，B 先看 [KICKOFF.md](KICKOFF.md)。

## 🚫 這個專案的紅線

- **不推 GitLab**（公司 GitLab 唯讀，與本案無關）
- **不發佈到 claude.ai** —— 不做 Artifact、不產生分享連結，**提案簡報尤其不可以**
- 唯一遠端：GitHub `a96020183/buildmode2026`（private）
- 給 三人組的東西走 `docs/`（GitHub Pages，公開）或 Google 表單
- **`docs/` 是公開的** —— 提案內容絕對不要放進去

agent 版本見 `CLAUDE.md` 開頭。

---

## B 的第一次設定（clone 完跑一次）

```powershell
git config user.name "0978632024"
git config user.email "lint96409@gmail.com"
```

第一行 **要照抄**（B 的 GitHub username）—— 戰情看板靠 `git log` 的作者名分辨 A 和 B，
名字不對的話你整天的工作會算到 A 頭上，你的 PiPi 永遠是灰的。
（設定檔在 `dashboard/build-status.ps1` 的 `$PEOPLE`。）

第二行不跑的話 git 會拒絕 commit。兩行都沒加 `--global`，只影響這個專案。

驗證：`git config user.name` 印出 `0978632024` 就對了。

要收 三人組的交件還要裝 Google Drive for Desktop，見 `inbox/INTAKE-PIPELINE.md` 第 5 步。
只寫 demo 不收件的話可以先不裝。

---

## 角色與權限

| 代號 | 是誰 | 能做 | 不能做 |
|---|---|---|---|
| **A** | **指揮家學長** | push repo、審批、部署 | — |
| **B** | **實務派LULU** | push repo、審批、部署（**Day 1 全權**） | — |
| **C / D / E** | **過勞星語 / 黑奴小恩 / 佐佐木阿崴** | 交素材、測 demo、寫提案段落 | 不碰 code、不碰 `deck/` 與 `demo/` |

**三人組不分工 —— 三個人都做全部三類**（研究素材／QA 回報／提案段落）。
重複不是浪費：三個人寫同一節，A/B 就有三個版本可以挑。反正都先進 `pending/`。

**審批規則：A 或 B 任一人同意就算過。不需要兩人都看。**

**Day 1 A 不在 → B 一人全權，不必等 A。**

三人組只有 ChatGPT / Gemini 網頁版，**不裝 git、不用 GitHub、不知道 repo 在哪**。
他們只填一張 Google Form（見 `inbox/FORM-SPEC.md`），A/B 收口。
整條 Form → 通知 → 本機的路見 `inbox/INTAKE-PIPELINE.md`。

---

## 一句話流程

```
C 填 Google Form  →  自動進 Sheet + 寄信通知 A/B
        ↓                                   ↓
   群組貼一行                    A/B 貼進 inbox/  →  agent 整理成候選放 pending/
（人工備援，最可靠）                                            ↓
                                              A 或 B 任一人 approve
                                                            ↓
                                                 才進 deck/ 或 research/
```

**交件管道與 GitHub 是斷開的。** 三人組不登入 GitHub、不知道 repo 網址 —— 這個斷開就是隔離本身。

**審批前，主提案（`deck/`、`demo/`）完全不會被動到。** 這是整套設計唯一要守住的事。

硬保險不是規則，是 git：每次動 `deck/` 或 `demo/` 前先 commit，改壞了 revert。

---

## B 單飛規則（Day 1）

B 可以自己決定任何事，不必等 A。但這三類決定要在 [DECISIONS.md](DECISIONS.md) 留一行：

1. 題目定位 / 提案主張的改變
2. demo 技術棧的選擇
3. 拒收 C 的產出並改派任務

規則不是「要不要問 A」—— 那由 B 自己判斷。規則是**決定要留痕**，A 第二天讀 DECISIONS.md 就追得上，不用重新對齊。

---

## 三天節奏

| | A | B | 星語 / 小恩 / 阿崴 |
|---|---|---|---|
| **Day 1** | 不在 | 定調（KICKOFF 30 分鐘）→ 起 demo 骨架 → 分派三節 | 各自認養一節，收工前交第一份 |
| **Day 2** | 進來讀 DECISIONS.md → 接手審批與整合 | 專心攻 demo | 交第二份 + **開始測 demo 交 QA 單** |
| **Day 3** | 灌 deck、對外收口 | 修 QA 單最高級的問題 | 全員 QA + 排練 |

**Cutoff**
- Day 3 上午 10:00 後：`deck/` 只收 typo 與數字修正，不收新段落
- Day 3 中午後：`demo/` 凍結，只修 crash

沒有 cutoff，審批會變成無限修改迴圈。

---

## 目錄

| 路徑 | 誰寫 | 說明 |
|---|---|---|
| `inbox/` | A/B 貼入 | C 交來的原始檔，agent 讀這裡 |
| `inbox/HOW-TO-SUBMIT.md` | — | **貼給 三人組的那一頁** |
| `inbox/FORM-SPEC.md` | — | 交件表單規格，A/B 照著建（約 10 分鐘） |
| `inbox/INTAKE-PIPELINE.md` | — | **通知 + 資料進本機的整條路**，含踩雷清單 |
| `inbox/FormIntake.gs` | — | Apps Script：落檔到 Drive + 通知 A/B |
| `docs/index.html` | — | 交件指南網頁。**這個資料夾由 Pages 公開**，只准放這一頁 |
| `sync-inbox.ps1` | — | 把 Drive 同步下來的交件複製進 `inbox/`（會自動找資料夾） |
| `ONBOARD-B.md` | — | 給 B 貼進 Codex 的上手指令 |
| **`HANDOFF.md`** | — | **換 PC 交接文件**：狀態、網址、秘密在哪、還沒做完什麼 |
| `NEW-PC.md` | — | 換機的精簡版指令（細節都在 HANDOFF.md） |
| `dashboard/` | — | **戰情看板**：五個 PiPi 依真實動作而動，雙擊 `index.html` |
| `pending/` | agent | 整理後的候選，等審批。可以隨便亂 |
| `deck/` | A/B | 提案內容來源，一節一個 .md |
| `demo/` | A/B | 可跑的 demo |
| `research/` | approve 後 | 競品、訪談、市場 |
| `demo-assets/` | approve 後 | 假資料、範例輸入、給評審看的操作腳本 |
| `CLAUDE.md` | — | A/B 本機 agent 的規則 |

**pptx / Google Slides 不進 git**（binary 沒法 merge）。repo 放內容來源，Day 3 由 A 灌進 deck。


## TapThrough 手機版 Prototype（2026-09-05）

R2 可操作版本在 `demo/`，以本輪使用者需求與 round1 規格實作。直接開 `demo/dist/index.html` 並選「進入 Demo」。執行／建置／URL 與 mock 邊界見 [demo/README.md](demo/README.md)，讀屏與現場測試見 [demo/ACCESSIBILITY_TEST.md](demo/ACCESSIBILITY_TEST.md)。

本次只在本機加入原型，未修改公開 docs、未推送或部署。原 ZIP 沒有 Git 歷史，已建立只追蹤原有 README、DECISIONS 與 demo README 的本機修改前快照；此快照不是 GitHub 歷史，不應直接取代遠端歷史。
