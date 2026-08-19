# Creates a desktop shortcut for 1688 Selector.
# ASCII-only on purpose: PowerShell 5.1 reads .ps1 as ANSI, UTF-8 Chinese would be mangled.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$icon = Join-Path $root 'assets\icon.ico'

if (-not (Test-Path $electron)) {
    Write-Host "[ERROR] electron.exe not found at $electron . Run 'npm install' first."
    exit 1
}

$lnkPath = Join-Path $desktop '1688 Selector.lnk'
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = $electron
$lnk.Arguments = '.'
$lnk.WorkingDirectory = $root
if (Test-Path $icon) { $lnk.IconLocation = $icon }
$lnk.Description = '1688 Selector - cross-border product research desktop app'
$lnk.Save()

Write-Host "Shortcut created: $lnkPath"
