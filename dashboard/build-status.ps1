<#
  BUILDMODE 戰情看板 —— 狀態產生器

  讀 git log（A/B 的動作）+ inbox/ 的交件檔名（C 三人的動作），
  算出每個人現在在幹嘛，寫成 dashboard\status.js 給看板讀。

  用法：
      .\dashboard\build-status.ps1            # 讀真實資料
      .\dashboard\build-status.ps1 -Demo      # 塞假資料，先看畫面長怎樣
      .\dashboard\build-status.ps1 -Watch     # 每 30 秒重算一次，開著不用管

  看板：雙擊 dashboard\index.html，它會自己每 20 秒重讀 status.js。
#>

param(
  [switch]$Demo,
  [switch]$Watch,
  [int]$IntervalSec = 30,
  [switch]$Public,   # 另外產一份「對外版」到 docs\，給 C 三人看
  [switch]$Push      # 搭配 -Public：只 commit/push docs\board* 那兩個檔
)

$ErrorActionPreference = 'Stop'

# 對外看板是給隊員看的，帶假資料上去等於騙人 —— 直接拒絕，不要只是警告
if ($Demo -and $Public) {
  Write-Host ""
  Write-Host "拒絕執行：-Demo 和 -Public 不能一起用。" -ForegroundColor Red
  Write-Host "  -Demo   是假資料，只給你本機看版面用"
  Write-Host "  -Public 會發佈到 GitHub Pages 給 C 三人看"
  Write-Host "  兩個一起用會把假的動態推上去，看起來像大家都在動工。"
  Write-Host ""
  Write-Host "看版面：   .\dashboard\build-status.ps1 -Demo" -ForegroundColor Cyan
  Write-Host "更新對外： .\dashboard\build-status.ps1 -Public -Push" -ForegroundColor Cyan
  Write-Host ""
  exit 1
}

# -Watch + -Push 每輪都會 commit。預設 30 秒的話一分鐘兩個 commit、三天上萬個。
# 使用者沒明講間隔就自動放長到 10 分鐘（反正 Pages 的 CDN 快取也差不多這個數）。
if ($Watch -and $Push -and -not $PSBoundParameters.ContainsKey('IntervalSec')) {
  $IntervalSec = 600
}

$Root = Split-Path -Parent $PSScriptRoot
$Out  = Join-Path $PSScriptRoot 'status.js'

# ============ 只改這一段：五個人是誰 ============
# git   = 那個人的 git user.name（A/B 兩台機器要設成不同名字，不然分不出來）
# form  = 那個人在表單「你是誰」選的名字（要和表單選項一字不差）
#         C/D/E 三人都做全部三類交件，不分工 —— 裝備不同只是為了認得出誰是誰
# gear  = PiPi 裝備槽，可用值見 dashboard\README.md
$PEOPLE = @(
  @{ id='A'; name='指揮家學長'; role='揮棒收口・說了算';      git='a96020183';  form='';
     gear=@{ torso='suit';         neck='tie'; head='';       face='';        hand='chart-board'; hand2='' } }
  @{ id='B'; name='實務派LULU'; role='真的在寫 code 的人';    git='0978632024'; form='';
     gear=@{ torso='hoodie';       neck='';    head='cap';    face='';        hand='laptop';      hand2='' } }
  @{ id='C'; name='過勞星語';   role='研究＋QA＋文案 全包';   git='';           form='過勞星語';
     gear=@{ torso='overalls';     neck='';    head='sprout'; face='glasses'; hand='magnifier';   hand2='books' } }
  @{ id='D'; name='黑奴小恩';   role='研究＋QA＋文案 全包';   git='';           form='黑奴小恩';
     gear=@{ torso='office-shirt'; neck='';    head='';       face='brows';   hand='megaphone';   hand2='' } }
  @{ id='E'; name='佐佐木阿崴';   role='點煙';                  git='';           form='佐佐木阿崴';
     gear=@{ torso='smock';        neck='';    head='beret';  face='';        hand='palette';     hand2='' } }
)

# 活動第一天的日期，用來算 DAY 1 / 2 / 3
$DAY1 = Get-Date '2026-09-04'
# ================================================

# PiPi 的四個等級（取自 PiPi 角色模型表，色碼不要自己改）
$LEVELS = @{
  lv1 = @{ skin='#F5A02B'; shade='#F07821'; no='LV.01' }
  lv2 = @{ skin='#C0803F'; shade='#A15F22'; no='LV.02' }
  lv3 = @{ skin='#C6CCD2'; shade='#97A1AB'; no='LV.03' }
  lv4 = @{ skin='#F5C93C'; shade='#D9A012'; no='LV.04' }
}

function Get-Level([int]$n) {
  if ($n -ge 5) { 'lv4' } elseif ($n -ge 3) { 'lv3' } elseif ($n -ge 1) { 'lv2' } else { 'lv1' }
}

function Get-State([int]$mins, [bool]$fresh) {
  if ($fresh)          { 'submitted' }   # 15 分鐘內剛交件 → 跳一下
  elseif ($mins -lt 0) { 'offline'   }   # 今天完全沒動作
  elseif ($mins -lt 20){ 'active'    }
  elseif ($mins -lt 90){ 'recent'    }
  else                 { 'idle'      }
}

function Build-Status {

  $now      = Get-Date
  $midnight = $now.Date
  $day      = [Math]::Max(1, ($now.Date - $DAY1.Date).Days + 1)
  $events   = New-Object System.Collections.Generic.List[object]

  # ---------- A / B：從 git log 取今天的 commit ----------
  if (-not $Demo) {
    Push-Location $Root
    try {
      # 行標記必須是純 ASCII。非 ASCII 字元（原本用 §）經過 PowerShell → git.exe
      # 的參數傳遞會被 cp950 弄壞，git 吐回來的標記對不上，整段解析會靜靜地失敗
      # —— 症狀是所有人都顯示 offline，即使今天明明有 commit。
      $mark = "~~C~~"
      # git 輸出是 UTF-8，但 PowerShell 讀原生指令輸出用的是 [Console]::OutputEncoding
      # （這台是 cp950）→ 中文 commit 訊息會變亂碼。暫時切成 UTF-8 再切回來。
      $prevEnc = [Console]::OutputEncoding
      try {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $raw = git log --since="$($midnight.ToString('yyyy-MM-dd')) 00:00" `
                       --pretty=format:"$mark%at%x09%an%x09%s" --name-only 2>$null
      } finally {
        [Console]::OutputEncoding = $prevEnc
      }
      if ($LASTEXITCODE -eq 0 -and $raw) {
        $curr = $null
        foreach ($line in $raw) {
          if ($line.StartsWith($mark)) {
            $p = $line.Substring($mark.Length) -split "`t", 3
            # 看板自己 -Push 產生的 commit 不算工作量，否則 A 的計數會虛高
            # 機器產生的 commit 不算工作量：看板自己推的、以及 Apps Script
            # 代交件推的。不濾掉的話會全部算到 token 擁有者（A）頭上。
            if ($p[2] -like 'board: 更新對外看板*' -or $p[2] -like '交件：*') {
              $curr = $null; continue
            }
            $curr = [ordered]@{
              at    = [DateTimeOffset]::FromUnixTimeSeconds([int64]$p[0]).LocalDateTime
              who   = $p[1]
              msg   = $p[2]
              files = New-Object System.Collections.Generic.List[string]
            }
            if ($curr) { $events.Add($curr) }
          } elseif ($curr -and $line.Trim()) {
            $curr.files.Add($line.Trim())
          }
        }
      }
    } finally { Pop-Location }
  }

  # ---------- C 三人：從 inbox 的檔名取交件 ----------
  # 檔名格式由 FormIntake.gs 產生：MMdd-HHmm_名字_類型.md
  $subs = New-Object System.Collections.Generic.List[object]
  $inbox = Join-Path $Root 'inbox'
  if (-not $Demo -and (Test-Path -LiteralPath $inbox)) {
    Get-ChildItem -LiteralPath $inbox -Filter '*.md' -File |
      Where-Object { $_.BaseName -match '^(\d{2})(\d{2})-(\d{2})(\d{2})_(.+?)_(.+)$' } |
      ForEach-Object {
        # 交件時間一律從檔名讀。檔案是 git pull 下來的，LastWriteTime 是
        # 「你拉取的時間」而不是「他交件的時間」——用它會讓所有交件看起來
        # 都發生在同一秒。
        $mo = [int]$Matches[1]; $dy = [int]$Matches[2]
        $hh = [int]$Matches[3]; $mi = [int]$Matches[4]
        $who = $Matches[5]; $type = $Matches[6]
        $at  = Get-Date -Year $now.Year -Month $mo -Day $dy -Hour $hh -Minute $mi -Second 0
        $grade = ''
        $txt = Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
        if ($txt -match 'A\s*級') { $grade = 'A' }
        elseif ($txt -match 'B\s*級') { $grade = 'B' }
        elseif ($txt -match 'C\s*級') { $grade = 'C' }
        $subs.Add([ordered]@{
          at = $at; who = $who; type = $type; grade = $grade; file = $_.Name
        })
      }
  }

  # ---------- 組每個人的狀態 ----------
  $roster = @()
  $feed   = New-Object System.Collections.Generic.List[object]

  foreach ($p in $PEOPLE) {
    $last = $null; $lastText = ''; $todayCount = 0

    if ($p.git) {
      $mine = $events | Where-Object { $_.who -eq $p.git }
      $todayCount += @($mine).Count
      $top = $mine | Sort-Object -Property { $_.at } -Descending | Select-Object -First 1
      if ($top) {
        $last = $top.at
        $zone = if ($top.files -match '^demo/') { 'demo' }
                elseif ($top.files -match '^deck/') { 'deck' }
                elseif ($top.files -match '^(research|demo-assets)/') { 'approve' }
                else { '' }
        $lastText = $(if ($zone) { "[$zone] " } else { '' }) + $top.msg
      }
      foreach ($e in $mine) {
        $feed.Add([ordered]@{ at=$e.at; who=$p.id; text=$e.msg })
      }
    }

    if ($p.form) {
      $mine = $subs | Where-Object { $_.who -eq $p.form }
      $today = $mine | Where-Object { $_.at -ge $midnight }
      $todayCount += @($today).Count
      $top = $mine | Sort-Object -Property { $_.at } -Descending | Select-Object -First 1
      if ($top -and (-not $last -or $top.at -gt $last)) {
        $last = $top.at
        $lastText = "交件 $($top.type)" + $(if ($top.grade) { " · $($top.grade) 級" } else { '' })
      }
      foreach ($e in $today) {
        $feed.Add([ordered]@{ at=$e.at; who=$p.id; text="交件 $($e.type)" })
      }
    }

    $mins  = if ($last) { [int]($now - $last).TotalMinutes } else { -1 }
    $fresh = ($mins -ge 0 -and $mins -lt 15 -and $p.form)
    $lv    = Get-Level $todayCount

    $roster += [ordered]@{
      id = $p.id; name = $p.name; role = $p.role
      gear = $p.gear
      level = $lv; skin = $LEVELS[$lv].skin; shade = $LEVELS[$lv].shade; levelNo = $LEVELS[$lv].no
      state = (Get-State $mins $fresh)
      todayCount = $todayCount
      minsAgo = $mins
      lastAt = $(if ($last) { $last.ToString('HH:mm') } else { '—' })
      lastText = $(if ($lastText) { $lastText } else { '今天還沒有動作' })
    }
  }

  # ---------- HUD 計數 ----------
  $pendingDir = Join-Path $Root 'pending'
  $pending = 0
  if (Test-Path -LiteralPath $pendingDir) {
    $pending = @(Get-ChildItem -LiteralPath $pendingDir -Filter '*.md' -File -ErrorAction SilentlyContinue).Count
  }
  $deckDone = 0
  $deckDir = Join-Path $Root 'deck'
  if (Test-Path -LiteralPath $deckDir) {
    $deckDone = @(Get-ChildItem -LiteralPath $deckDir -Filter '*.md' -File -ErrorAction SilentlyContinue |
                  Where-Object { $_.Name -ne 'OUTLINE.md' }).Count
  }

  $status = [ordered]@{
    generated = $now.ToString('yyyy-MM-dd HH:mm:ss')
    clock     = $now.ToString('HH:mm')
    day       = $day
    counters  = [ordered]@{
      pending   = $pending
      submitted = @($subs | Where-Object { $_.at -ge $midnight }).Count
      gradeA    = @($subs | Where-Object { $_.grade -eq 'A' }).Count
      deckDone  = $deckDone
      deckTotal = 8
    }
    people = $roster
    feed   = @($feed | Sort-Object -Property { $_.at } -Descending | Select-Object -First 14 | ForEach-Object {
      [ordered]@{ at = $_.at.ToString('HH:mm'); who = $_.who; text = $_.text }
    })
  }

  if ($Demo) { $status = Get-DemoStatus $status }
  return $status
}

function Get-DemoStatus($s) {
  $s.counters.pending = 3; $s.counters.submitted = 7
  $s.counters.gradeA = 1;  $s.counters.deckDone = 2
  $demo = @(
    @{ state='active';    last='[deck] approve 06-市場與競品'; at='14:28'; n=4; lv='lv3' }
    @{ state='active';    last='[demo] 修 K 線縮放';       at='14:31'; n=6; lv='lv4' }
    @{ state='submitted'; last='交件 研究素材';            at='14:26'; n=2; lv='lv2' }
    @{ state='recent';    last='交件 QA 回報 · A 級';      at='13:15'; n=3; lv='lv3' }
    @{ state='idle';      last='交件 提案段落';            at='11:40'; n=1; lv='lv2' }
  )
  for ($i = 0; $i -lt $s.people.Count -and $i -lt $demo.Count; $i++) {
    $s.people[$i].state      = $demo[$i].state
    $s.people[$i].lastText   = $demo[$i].last
    $s.people[$i].lastAt     = $demo[$i].at
    $s.people[$i].todayCount = $demo[$i].n
    $lv = $demo[$i].lv
    $s.people[$i].level = $lv
    $s.people[$i].skin  = $LEVELS[$lv].skin
    $s.people[$i].shade = $LEVELS[$lv].shade
    $s.people[$i].levelNo = $LEVELS[$lv].no
  }
  $s.feed = @(
    @{ at='14:31'; who='B';  text='[demo] 修 K 線縮放' }
    @{ at='14:28'; who='A';  text='[deck] approve 06-市場與競品' }
    @{ at='14:26'; who='C'; text='交件 研究素材' }
    @{ at='13:15'; who='D'; text='交件 QA 回報 · A 級' }
    @{ at='12:50'; who='B';  text='[demo] 接上假資料 API' }
    @{ at='11:40'; who='E'; text='交件 提案段落' }
  )
  return $s
}

# 對外版：拿掉 commit 訊息與活動明細，只留角色狀態
function Write-PublicStatus($s) {
  $docs = Join-Path $Root 'docs'
  if (-not (Test-Path -LiteralPath $docs)) { New-Item -ItemType Directory -Path $docs | Out-Null }

  $label = @{
    active    = '正在動工'
    submitted = '剛交件！'
    recent    = '剛剛還在動'
    idle      = '休息中'
    offline   = '今天還沒開工'
  }

  # 深拷貝後洗掉敏感欄位
  $pub = $s | ConvertTo-Json -Depth 8 | ConvertFrom-Json
  foreach ($p in $pub.people) {
    $p.lastText = $label[$p.state]          # ← commit 訊息換成通用字眼
    $p.PSObject.Properties.Remove('minsAgo')
  }
  $pub.feed = @()                            # ← 活動明細整個丟掉
  $pub.counters.PSObject.Properties.Remove('pending')
  $pub.counters.PSObject.Properties.Remove('gradeA')
  $pub | Add-Member -NotePropertyName isPublic -NotePropertyValue $true -Force

  $json = $pub | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath (Join-Path $docs 'board-status.js') `
    -Value "// 由 build-status.ps1 -Public 產生，不要手改`r`nwindow.BUILDMODE_STATUS = $json;`r`n" -Encoding UTF8

  # 看板本體從 dashboard\index.html 生成，維持單一設計來源
  $html = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot 'index.html'),
            [System.Text.UTF8Encoding]::new($false))
  $html = $html.Replace('<script src="status.js"></script>', '<script src="board-status.js"></script>')

  # 頁尾原本印的是內部指令與目錄名 —— 在「產生時」就換掉，不要留在原始碼裡靠 JS 蓋
  $newFoot = '<footer id="foot">' +
             '<span>開著就好，會自己更新。</span>' +
             '<span>橘色格子＝今天的動作數，滿 5 格會升級換色。</span>' +
             '<span>角色：PiPi（PressPlay Academy）</span>' +
             '</footer>'
  $html = [regex]::Replace($html, '<footer[^>]*>[\s\S]*?</footer>', $newFoot)
  [System.IO.File]::WriteAllText((Join-Path $docs 'board.html'), $html,
            [System.Text.UTF8Encoding]::new($false))

  Write-Host '  對外版已更新：docs/board.html' -ForegroundColor Green

  if ($Push) {
    Push-Location $Root
    try {
      git add docs/board.html docs/board-status.js 2>$null
      $staged = git diff --cached --name-only 2>$null
      if ($staged) {
        git commit -q -m "board: 更新對外看板 ($($s.clock))" 2>$null
        git push -q origin main 2>$null
        if ($LASTEXITCODE -eq 0) {
          Write-Host "  已推上 GitHub Pages" -ForegroundColor Green
        } else {
          Write-Host "  推送失敗。最可能是 B 也推了東西、你這邊落後了。" -ForegroundColor Yellow
          Write-Host "  修法：git pull --rebase  然後再跑一次這個指令。" -ForegroundColor Yellow
        }
      } else {
        Write-Host "  沒有變動，不用推" -ForegroundColor DarkGray
      }
    } finally { Pop-Location }
  }
}

function Write-Status {
  $s = Build-Status
  $json = $s | ConvertTo-Json -Depth 8 -Compress:$false
  $js = "// 由 build-status.ps1 產生，不要手改`r`nwindow.BUILDMODE_STATUS = $json;`r`n"
  Set-Content -LiteralPath $Out -Value $js -Encoding UTF8

  if ($Public) { Write-PublicStatus $s }

  $tag = if ($Demo) { ' [DEMO]' } else { '' }
  Write-Host ("[{0}]{1} 已更新 status.js —— 待審批 {2} · 今日交件 {3} · A級 {4}" -f `
    $s.clock, $tag, $s.counters.pending, $s.counters.submitted, $s.counters.gradeA) -ForegroundColor Green
}

if ($Watch) {
  Write-Host "看板資料每 $IntervalSec 秒重算一次，Ctrl+C 停止。" -ForegroundColor Cyan
  Write-Host "本機看板：雙擊 dashboard/index.html（網頁每 20 秒重讀資料）" -ForegroundColor Cyan
  if ($Public -and $Push) {
    Write-Host "對外看板：https://a96020183.github.io/buildmode2026/board.html" -ForegroundColor Cyan
    Write-Host "          （Pages 的 CDN 快取約 10 分鐘，所以線上不會即時）" -ForegroundColor DarkGray
  }
  Write-Host ""
  while ($true) {
    try { Write-Status } catch { Write-Host "更新失敗：$_" -ForegroundColor Red }
    Start-Sleep -Seconds $IntervalSec
  }
} else {
  Write-Status
  Write-Host "看板：雙擊 dashboard\index.html" -ForegroundColor Cyan
  if ($Public) {
    Write-Host "對外版：https://a96020183.github.io/buildmode2026/board.html" -ForegroundColor Cyan
  }
}
