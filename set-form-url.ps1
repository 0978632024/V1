<#
  把 setup() 印出來的表單網址填回所有該填的地方

  跑完 SetupForm.gs 的 setup() 之後，執行紀錄會給你四個網址。
  拿①填答網址 和 ④交件檔案資料夾的本機鏡像路徑 跑這支，一次改完三個檔。

  用法：
      .\set-form-url.ps1 -FormUrl "https://docs.google.com/forms/d/e/XXXX/viewform"

      .\set-form-url.ps1 -FormUrl "https://..." `
                         -InboxPath "G:\我的雲端硬碟\BUILDMODE 2026 交件\交件檔案"

  可以重複跑，第二次會蓋掉第一次填的。
#>

param(
  [Parameter(Mandatory = $true)][string]$FormUrl,
  [string]$InboxPath
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot

if ($FormUrl -notmatch '^https://docs\.google\.com/forms/') {
  Write-Host "這看起來不像 Google 表單網址：" -ForegroundColor Yellow
  Write-Host "  $FormUrl"
  Write-Host "要的是 setup() 印出來的①「填答網址」，長得像："
  Write-Host "  https://docs.google.com/forms/d/e/XXXXXXXX/viewform" -ForegroundColor Cyan
  exit 1
}

$changed = @()

function Set-FileText($Path, $Pattern, $Replacement, $Label) {
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Host "  跳過（找不到）：$Path" -ForegroundColor DarkGray
    return
  }
  $raw = [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
  $new = [regex]::Replace($raw, $Pattern, $Replacement)
  if ($new -eq $raw) {
    Write-Host "  沒有變動：$Label" -ForegroundColor DarkGray
  } else {
    [System.IO.File]::WriteAllText($Path, $new, [System.Text.UTF8Encoding]::new($false))
    $script:changed += $Label
    Write-Host "  已更新：$Label" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "填入表單網址…" -ForegroundColor Cyan

# 1) 給 三人組的 markdown 版
Set-FileText (Join-Path $Root 'inbox\HOW-TO-SUBMIT.md') `
  '(?m)^\*\*交件表單[^\r\n]*' `
  ("**交件表單：** $FormUrl") `
  'inbox\HOW-TO-SUBMIT.md'

# 2) 給 三人組的網頁版（雙擊即開那個）
Set-FileText (Join-Path $Root 'docs\index.html') `
  '(?s)<div class="action-slot">.*?</div>' `
  ("<a class=""action-slot"" href=""$FormUrl"" target=""_blank"" rel=""noopener"">" +
   "<span class=""tag"">交件表單</span><span>點這裡開始填 →</span></a>") `
  'docs\index.html（GitHub Pages）'

# 3) 本機鏡像路徑
if ($InboxPath) {
  if (-not (Test-Path -LiteralPath $InboxPath)) {
    Write-Host "  ⚠ 這個路徑現在不存在：$InboxPath" -ForegroundColor Yellow
    Write-Host "    Drive for Desktop 還沒同步好的話先跑起來，或之後再跑一次這支。" -ForegroundColor Yellow
  }
  $esc = $InboxPath -replace '"', '""'
  Set-FileText (Join-Path $Root 'sync-inbox.ps1') `
    '(?m)^\s*\[string\]\$Src\s*=\s*"[^"]*"' `
    ("  [string]`$Src = ""$esc""") `
    'sync-inbox.ps1（$Src）'
} else {
  Write-Host "  略過 sync-inbox.ps1 —— 要填的話加 -InboxPath ""<鏡像資料夾>""" -ForegroundColor DarkGray
}

Write-Host ""
if ($changed.Count -eq 0) {
  Write-Host "沒有任何檔案被改到。可能已經填過了，或檔案被手動改過格式。" -ForegroundColor Yellow
} else {
  Write-Host "改了 $($changed.Count) 個檔案。接下來：" -ForegroundColor Green
  Write-Host ""
  Write-Host "  1. 把 docs\index.html 傳給 三人組，或給他們 Pages 網址（見 LINKS.md）"
  Write-Host "  2. git add -A; git commit -m ""form: 填入表單網址""; git push"
  Write-Host ""
}
