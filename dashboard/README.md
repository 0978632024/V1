# 戰情看板

五個 PiPi 站成一排，誰在幹嘛一眼看到。角色沿用 **PiPi 角色模型表** 的 vector 原稿
（30 個裝備 `<g id="w-*">` + 4 級膚色），一個字沒改；外框、計數器、狀態燈走 8-bit。

**純本機，不上傳任何地方。** 雙擊 `index.html` 就開。

---

## 怎麼跑

```powershell
# 先看畫面長怎樣（塞假資料）
.\dashboard\build-status.ps1 -Demo

# 讀真實資料，跑一次
.\dashboard\build-status.ps1

# 活動期間開著不用管，每 30 秒重算
.\dashboard\build-status.ps1 -Watch
```

然後雙擊 `dashboard\index.html`。

**「更新」有兩層，別搞混：**

| 層 | 多久一次 | 誰負責 |
|---|---|---|
| 網頁重讀 `status.js` | 20 秒（線上版 60 秒） | 自動 |
| **`status.js` 本身重算** | **只有跑 `build-status.ps1` 時** | 你 |

所以沒開 `-Watch` 的話，看板會永遠停在你上次跑的那一刻。開了才會動。

活動期間想讓對外看板也跟著動：

```powershell
.\dashboard\build-status.ps1 -Watch -Public -Push
```

每 10 分鐘重算 + 推上 Pages（`-Watch -Push` 會自動把間隔放長，
不然一分鐘兩個 commit）。**但線上版本質上不是即時的** —— GitHub Pages
的 CDN 快取約 10 分鐘，所以隊員看到的大概落後 10–20 分鐘。
情緒價值夠用，別當作即時監控。

---

## 角色為什麼會動

| 資料來源 | 誰 | 抓什麼 |
|---|---|---|
| `git log --since=今天` | A / B | commit 時間、作者、動到 `deck/` 還是 `demo/` |
| `inbox/*.md` 檔名 | 星語 / 小恩 / 阿崴 | `MMdd-HHmm_名字_類型.md`，由 `FormIntake.gs` 產生 |
| `inbox/*.md` 內文 | 小恩 | 抓「A 級 / B 級 / C 級」算未修的 A 級數 |
| `pending/*.md` | — | 待審批數 |
| `deck/*.md` | — | 提案完成節數 |

狀態決定動作：

| 狀態 | 條件 | 畫面 |
|---|---|---|
| `submitted` | 15 分鐘內剛交件 | 跳起來 + 紅圈脈動 |
| `active` | 20 分鐘內有動作 | 快速 2 格上下晃 |
| `recent` | 90 分鐘內 | 慢速晃 |
| `idle` | 更久 | 緩慢呼吸 |
| `offline` | 今天完全沒動作 | 灰掉、不動 |

動畫刻意用 `steps(1,end)` 兩格切換，不做平滑補間 —— 這樣 vector 的 PiPi 動起來才有 sprite 感。

**膚色 = 今日累計動作數**，不是裝飾：

| 件數 | 等級 | 色 |
|---|---|---|
| 0 | LV.01 見習 | `#F5A02B` 橘（PiPi 原色） |
| 1–2 | LV.02 大地 | `#C0803F` |
| 3–4 | LV.03 銀灰 | `#C6CCD2` |
| 5+ | LV.04 金黃 | `#F5C93C` |

---

## ⚠️ 設定：A 和 B 的 git user.name 一定要不一樣

看板靠 `git log` 的作者名分辨 A 和 B。兩台機器都用同一個名字的話，會全算到同一個人頭上。

```powershell
# A 的機器
git config user.name "a96020183"
# B 的機器
git config user.name "B的名字"
```

然後把名字填進 `build-status.ps1` 的 `$PEOPLE` 裡的 `git` 欄位。
三人組的 `form` 欄位要填**表單「你是誰」選項的文字**，一字不差。

---

## 換裝備

改 `build-status.ps1` 的 `$PEOPLE`。可用值（取自 PiPi 模型表的 30 個 symbol）：

| 槽位 | 可用值 |
|---|---|
| `torso` | `suit` `hoodie` `overalls` `office-shirt` `smock` `knit` `tank` `chef-uniform` `apron` |
| `head` | `cap` `beret` `beanie` `sprout` `headband` `chef-hat` `chef-hat-mini` |
| `face` | `glasses` `brows` `glasses+brows` |
| `neck` | `tie` `neckerchief` |
| `hand` | `laptop` `magnifier` `megaphone` `chart-board` `palette` `coffee` `dumbbell` `plant` `cupcake` |
| `hand2` | `books` |

留空字串就是不戴。

圖層順序是 PiPi 原稿定的，不要改：`[sprout, hand2] → 本體 → [torso, neck, head, face…, hand]`。
`sprout`（呆毛）和 `hand2`（書）要在本體後面，其他在前面。

---

## 已知限制

- **git 只看得到 commit 過的東西。** B 寫了兩小時沒 commit，看板上他就是 `idle`。這反而是好事 —— 逼大家 commit。
- **三人組的動作只有「交件」一種。** 他們沒有 git，交件是唯一能觀測到的訊號。所以 C 的角色多半是在 `idle` 和 `submitted` 之間跳，不會像 A/B 那樣持續 `active`。
- **`status.js` 是產生出來的，不要手改**，跑一次就蓋掉。
- 字型走 Google Fonts（Press Start 2P + Noto Sans TC），離線時會退回系統字，版面還在但 pixel 感會掉。
