# Build a release APK (requires Android SDK + JDK).
$ErrorActionPreference = "Stop"

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"

if (-not (Test-Path "$javaHome\bin\java.exe")) {
  Write-Error "JDK not found at $javaHome. Install Android Studio or set JAVA_HOME manually."
}

if (-not (Test-Path $androidHome)) {
  Write-Error "Android SDK not found at $androidHome. Open Android Studio → SDK Manager and install the SDK."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:EXPO_NO_METRO_WORKSPACE_ROOT = "1"
$env:PATH = "$javaHome\bin;$androidHome\platform-tools;$env:PATH"

$androidDir = Join-Path $PSScriptRoot "..\android"
if (-not (Test-Path (Join-Path $androidDir "gradlew.bat"))) {
  Write-Host "Running expo prebuild..."
  Push-Location (Join-Path $PSScriptRoot "..")
  npx expo prebuild --platform android
  Pop-Location
}

$localProps = Join-Path $androidDir "local.properties"
$sdkLine = "sdk.dir=$($androidHome -replace '\\', '/')"
if (-not (Test-Path $localProps)) {
  Set-Content -Path $localProps -Value "sdk.dir=$($androidHome -replace '\\', '\\')"
} else {
  $content = Get-Content $localProps -Raw
  if ($content -notmatch "sdk\.dir=") {
    Add-Content -Path $localProps -Value "sdk.dir=$($androidHome -replace '\\', '\\')"
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
} else {
  Write-Host "Build finished but APK not found at expected path." -ForegroundColor Yellow
}
