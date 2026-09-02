# Build a release APK (requires Android SDK + JDK).
# Loads repo root .env so EXPO_PUBLIC_* vars are embedded in the native build.
param(
  [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$scriptMobileDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scriptRepoRoot = (Resolve-Path (Join-Path $scriptMobileDir '..\..')).Path
$envFile = Join-Path $scriptRepoRoot '.env'
$mobileDir = $scriptMobileDir
$repoRoot = $scriptRepoRoot

function Test-WindowsLongPathsEnabled {
  try {
    $item = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -ErrorAction SilentlyContinue
    return $item.LongPathsEnabled -eq 1
  } catch {
    return $false
  }
}

if ($env:OS -match 'Windows') {
  if (-not (Test-WindowsLongPathsEnabled)) {
    Write-Host 'Windows long paths are disabled. Enable them to avoid native build failures:' -ForegroundColor Yellow
    Write-Host '  gpedit.msc -> Computer Configuration -> Administrative Templates -> System -> Filesystem -> Enable Win32 long paths = Enabled' -ForegroundColor Yellow
    Write-Host '  Or run PowerShell as Administrator:' -ForegroundColor Yellow
    Write-Host '  New-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem -Name LongPathsEnabled -Value 1 -PropertyType DWord -Force' -ForegroundColor Yellow
  }
}

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
    if (-not [string]::IsNullOrWhiteSpace($key)) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
  Write-Host "Loaded environment from $envFile" -ForegroundColor Cyan
} else {
  Write-Host 'No .env at repo root; EXPO_PUBLIC_* may be missing in the APK.' -ForegroundColor Yellow
}

$studioJbr = Join-Path ${env:ProgramFiles} 'Android\Android Studio\jbr'
$javaBin = Join-Path $studioJbr 'bin\java.exe'
$javaHome = if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $env:JAVA_HOME
} elseif (Test-Path $javaBin) {
  $studioJbr
} else {
  $null
}

$defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$androidHome = if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
  $env:ANDROID_HOME
} elseif (Test-Path $defaultSdk) {
  $defaultSdk
} else {
  $null
}

if (-not $javaHome) {
  throw 'JDK not found. Install Android Studio or set JAVA_HOME to a valid JDK.'
}

if (-not $androidHome) {
  throw 'Android SDK not found. Open Android Studio SDK Manager or set ANDROID_HOME.'
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:NODE_ENV = 'production'
$env:GRADLE_USER_HOME = Join-Path $env:LOCALAPPDATA 'pk-gradle'
$env:EXPO_NO_METRO_WORKSPACE_ROOT = '1'
$env:PATH = (Join-Path $javaHome 'bin') + ';' + (Join-Path $androidHome 'platform-tools') + ';' + $env:PATH

$androidDir = Join-Path $mobileDir 'android'
$appBuildGradle = Join-Path $androidDir 'app\build.gradle'
$sdkDir = ($androidHome -replace '\\', '/')

function Test-MonorepoGradlePatch {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $content = Get-Content $Path -Raw
  return ($content -match 'root = file\("\.\./\.\./"\)') -and ($content -match 'resolveEntryPoint')
}

function Test-WindowsPathPatch {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $content = Get-Content $Path -Raw
  return $content -match 'CMAKE_OBJECT_PATH_MAX'
}

$needsPrebuild = $Clean -or -not (Test-Path (Join-Path $androidDir 'gradlew.bat')) -or -not (Test-MonorepoGradlePatch $appBuildGradle) -or -not (Test-WindowsPathPatch $appBuildGradle)
if ($needsPrebuild) {
  Write-Host 'Running expo prebuild (env vars from .env will be baked into app.config)...'
  Push-Location $mobileDir
  try {
    if ($Clean -or -not (Test-Path (Join-Path $androidDir 'gradlew.bat'))) {
      npx expo prebuild --platform android --clean
    } else {
      npx expo prebuild --platform android
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }
}

$localProps = Join-Path $androidDir 'local.properties'
if (-not (Test-Path $localProps)) {
  Set-Content -Path $localProps -Value "sdk.dir=$sdkDir"
} else {
  $content = Get-Content $localProps -Raw
  if ($content -notmatch 'sdk\.dir=') {
    Add-Content -Path $localProps -Value "sdk.dir=$sdkDir"
  }
}

$cxxDir = Join-Path $androidDir 'app\.cxx'
$stagingDir = Join-Path $env:LOCALAPPDATA 'pk-cxx'
if ($env:OS -match 'Windows') {
  if (Test-Path $cxxDir) {
    Write-Host 'Clearing native CMake cache (.cxx)...' -ForegroundColor Cyan
    Remove-Item -Recurse -Force $cxxDir
  }
  if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
  }
}

Write-Host 'Building release APK with Gradle...'
Push-Location $androidDir
try {
  & .\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$apk = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) {
  throw "Build finished but APK not found at $apk"
}

$assetsDir = Join-Path $scriptMobileDir 'assets'
$webDownloadDir = Join-Path $scriptRepoRoot 'apps\web\public\downloads'
$assetApk = Join-Path $assetsDir 'perakita.apk'
$webApk = Join-Path $webDownloadDir 'perakita.apk'

New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
New-Item -ItemType Directory -Force -Path $webDownloadDir | Out-Null
Copy-Item -Path $apk -Destination $assetApk -Force
Copy-Item -Path $apk -Destination $webApk -Force

Write-Host ''
Write-Host 'APK ready:' -ForegroundColor Green
Write-Host $apk
Write-Host 'Copied to:' -ForegroundColor Green
Write-Host $assetApk
Write-Host $webApk

if (-not $env:EXPO_PUBLIC_SUPABASE_URL) {
  Write-Host ''
  Write-Host 'Warning: EXPO_PUBLIC_SUPABASE_URL is empty. Set it in repo root .env before building.' -ForegroundColor Yellow
}
