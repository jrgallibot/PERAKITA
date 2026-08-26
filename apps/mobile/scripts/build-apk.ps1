# Build a release APK (requires Android SDK + JDK).
# Loads repo root .env so EXPO_PUBLIC_* vars are embedded in the native build.
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$envFile = Join-Path $repoRoot ".env"

if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [string]::IsNullOrWhiteSpace($key) -and -not (Test-Path "Env:$key")) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
  Write-Host "Loaded environment from $envFile" -ForegroundColor Cyan
} else {
  Write-Host "No .env at repo root — EXPO_PUBLIC_* may be missing in the APK." -ForegroundColor Yellow
}

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path "$javaHome\bin\java.exe")) {
  Write-Error "JDK not found at $javaHome. Install Android Studio or set JAVA_HOME manually."
}

if (-not (Test-Path $androidHome)) {
  Write-Error "Android SDK not found at $androidHome. Open Android Studio -> SDK Manager and install the SDK."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:EXPO_NO_METRO_WORKSPACE_ROOT = "1"
$env:PATH = "$javaHome\bin;$androidHome\platform-tools;$env:PATH"

$mobileDir = Join-Path $PSScriptRoot ".."
$androidDir = Join-Path $mobileDir "android"
$sdkDir = ($androidHome -replace '\\', '/')

if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
  Write-Host "Running expo prebuild (env vars from .env will be baked into app.config)..."
  Push-Location $mobileDir
  npx expo prebuild --platform android --clean
  Pop-Location
}

$localProps = Join-Path $androidDir "local.properties"
if (-not (Test-Path $localProps)) {
  Set-Content -Path $localProps -Value "sdk.dir=$sdkDir"
} else {
  $content = Get-Content $localProps -Raw
  if ($content -notmatch "sdk\.dir=") {
    Add-Content -Path $localProps -Value "sdk.dir=$sdkDir"
  }
}

Push-Location $androidDir
.\gradlew assembleRelease
Pop-Location

$apk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  Write-Host ""
  Write-Host "APK ready:" -ForegroundColor Green
  Write-Host $apk
  if (-not $env:EXPO_PUBLIC_SUPABASE_URL) {
    Write-Host ""
    Write-Host "Warning: EXPO_PUBLIC_SUPABASE_URL is empty — set it in repo root .env before building." -ForegroundColor Yellow
  }
} else {
  Write-Host "Build finished but APK not found at expected path." -ForegroundColor Yellow
}
