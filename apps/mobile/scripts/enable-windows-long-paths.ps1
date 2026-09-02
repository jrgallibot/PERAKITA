# Enable Win32 long paths (required for React Native New Architecture on Windows).
# Run PowerShell as Administrator, then:
#   powershell -ExecutionPolicy Bypass -File .\scripts\enable-windows-long-paths.ps1
$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host 'Re-run this script in an Administrator PowerShell window.' -ForegroundColor Red
  exit 1
}

$key = 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem'
$current = (Get-ItemProperty -Path $key -Name 'LongPathsEnabled' -ErrorAction SilentlyContinue).LongPathsEnabled

if ($current -eq 1) {
  Write-Host 'Windows long paths are already enabled.' -ForegroundColor Green
} else {
  New-ItemProperty -Path $key -Name 'LongPathsEnabled' -Value 1 -PropertyType DWord -Force | Out-Null
  Write-Host 'Enabled Windows long paths. Sign out and back in (or reboot), then run: pnpm build:apk' -ForegroundColor Green
}

# Helps git on Windows with long paths in this repo.
git -C (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path config core.longpaths true
Write-Host 'Set git core.longpaths=true for the repo.' -ForegroundColor Green
