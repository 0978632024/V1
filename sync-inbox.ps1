<#
  把新交件抓下來

  交件檔由 Apps Script 直接 commit 進這個 repo 的 inbox/，
  所以「同步」就是 git pull —— 換幾台 PC 都一樣，不用裝 Google Drive for Desktop。

  用法（在 repo 根目錄）：
      .\sync-inbox.ps1              ← git pull，列出這次多了哪幾份
      .\sync-inbox.ps1 -NoPull      ← 不拉，只列現在 inbox/ 有什麼
      .\sync-inbox.ps1 -Src "<路徑>" ← 備援：從 Drive 鏡像資料夾複製（見下）

  跑完跟 Claude 說一句「整理 inbox」，規則見 CLAUDE.md。

  備援說明：Apps Script 同時也會把檔案落到 Drive 的「交件檔案」資料夾。
  萬一 GitHub token 掛了，可以裝 Google Drive for Desktop、把那個資料夾設成
  「鏡像」，再用 -Src 指定本機路徑。平常用不到。
#>

param(
  [switch]$NoPull,
  [string]$Src,
  [string]$Dst = (Join-Path $PSScriptRoot "inbox")
)

$ErrorActionPreference = 'Stop'

function Get-InboxFiles {
  if (-not (Test-Path -LiteralPath $Dst)) { return @() }
  @(Get-ChildItem -LiteralPath $Dst -Filter '*.md' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.BaseName -match '^\d{4}-\d{4}_' })
}

$before = @(Get-InboxFiles | ForEach-Object { $_.Name })

# ---------- 主路：git pull ----------
if (-not $NoPull -and -not $Src) {
  Push-Location $PSScriptRoot
  try {
    Write-Host ""
    Write-Host "拉取新交件…" -ForegroundColor Cyan
    $out = git pull --rebase --autostash 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Host ""
      Write-Host "git pull 失敗：" -ForegroundColor Red
      $out | ForEach-Object { Write-Host "  $_" }
      Write-Host ""
      Write-Host "常見原因：" -ForegroundColor Yellow
      Write-Host "  - 本機有沒 commit 的改動且和遠端衝突 → 先 git status 看一下"
      Write-Host "  - 沒網路"
      exit 1
    }
  } finally { Pop-Location }
}

# ---------- 備援：從 Drive 鏡像資料夾複製 ----------
if ($Src) {
  if (-not (Test-Path -LiteralPath $Src)) {
    Write-Host "找不到來源資料夾：$Src" -ForegroundColor Yellow
    Write-Host "（那是 Google Drive for Desktop 的鏡像路徑，要先裝並設成「鏡像檔案」）"
    exit 1
  }
  if (-not (Test-Path -LiteralPath $Dst)) { New-Item -ItemType Directory -Path $Dst | Out-Null }
  Get-ChildItem -LiteralPath $Src -Filter *.md -File | ForEach-Object {
    $t = Join-Path $Dst $_.Name
    if (-not (Test-Path -LiteralPath $t)) { Copy-Item -LiteralPath $_.FullName -Destination $t }
  }
  Write-Host "已從 Drive 備援路徑複製。" -ForegroundColor DarkGray
}

# ---------- 報告 ----------
$after = @(Get-InboxFiles)
$new   = @($after | Where-Object { $before -notcontains $_.Name })

Write-Host ""
if ($new.Count -eq 0) {
  Write-Host "沒有新交件。" -ForegroundColor DarkGray
  Write-Host "（inbox/ 目前共 $($after.Count) 份）" -ForegroundColor DarkGray
} else {
  Write-Host "新交件 $($new.Count) 份：" -ForegroundColor Green
  foreach ($f in ($new | Sort-Object Name)) {
    # 檔名格式 MMdd-HHmm_名字_類型.md
    if ($f.BaseName -match '^(\d{2})(\d{2})-(\d{2})(\d{2})_(.+?)_(.+)$') {
      Write-Host ("   {0}/{1} {2}:{3}  {4,-8} {5}" -f `
        $Matches[1], $Matches[2], $Matches[3], $Matches[4], $Matches[5], $Matches[6])
    } else {
      Write-Host "   + $($f.Name)"
    }
  }
  Write-Host ""
  Write-Host "接著跟 Claude 說：" -NoNewline
  Write-Host " 整理 inbox" -ForegroundColor Cyan
}
Write-Host ""
