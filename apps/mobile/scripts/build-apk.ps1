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

if ($env:OS -match 'Windows' -and $env:PERAKITA_ENABLE_SUBST_BUILD -eq '1' -and $env:PERAKITA_SHORT_PATH_BUILD -ne '1') {
  $driveLetter = @('P', 'Q', 'R', 'S') | Where-Object {
    -not (Test-Path "$_`:\")
  } | Select-Object -First 1

  if ($driveLetter) {
    $drive = "$driveLetter`:"
    Write-Host "Using short build path $drive for Android native build..." -ForegroundColor Cyan
    cmd /c "subst $drive `"$scriptRepoRoot`""
    if ($LASTEXITCODE -eq 0) {
      try {
        $env:PERAKITA_SHORT_PATH_BUILD = '1'
        $env:PERAKITA_REAL_REPO_ROOT = $scriptRepoRoot
        $env:PERAKITA_SHORT_REPO_ROOT = "$drive\"
        $shortScript = Join-Path "$drive\" 'apps\mobile\scripts\build-apk.ps1'
        $args = @('-ExecutionPolicy', 'Bypass', '-File', $shortScript)
        if ($Clean) { $args += '-Clean' }
        & powershell @args
        exit $LASTEXITCODE
      } finally {
        cmd /c "subst $drive /D" | Out-Null
      }
    }
  }
}

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
$env:pnpm_config_verify_deps_before_run = 'false'
$env:GRADLE_USER_HOME = 'D:\g'
$env:EXPO_NO_METRO_WORKSPACE_ROOT = '1'
$env:PATH = (Join-Path $javaHome 'bin') + ';' + (Join-Path $androidHome 'platform-tools') + ';' + $env:PATH

$androidDir = Join-Path $mobileDir 'android'
$appBuildGradle = Join-Path $androidDir 'app\build.gradle'
$sdkDir = ($androidHome -replace '\\', '/')

function Test-MonorepoGradlePatch {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $content = Get-Content $Path -Raw
  return ($content -match 'root = file\("\.\./\.\./"\)') -and ($content -match 'entryFile = file\("\.\./\.\./index\.js"\)')
}

function Test-WindowsPathPatch {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $content = Get-Content $Path -Raw
  return ($content -match 'CMAKE_OBJECT_PATH_MAX') -and ($content -match 'CMAKE_SUPPRESS_REGENERATION') -and ($content -match 'buildStagingDirectory file\("D:/c"\)')
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

function Add-CMakeSuppressRegenerationArgument {
  param([string]$AndroidPackageDir)

  $gradleFiles = @(
    (Join-Path $AndroidPackageDir 'build.gradle'),
    (Join-Path $AndroidPackageDir 'build.gradle.kts')
  )

  foreach ($gradleFile in $gradleFiles) {
    if (-not (Test-Path $gradleFile)) { continue }
    $content = Get-Content $gradleFile -Raw
    if ($content -match 'CMAKE_SUPPRESS_REGENERATION') { continue }

    $updated = $content
    if ($gradleFile.EndsWith('.kts')) {
      $updated = $updated -replace 'arguments\(\r?\n', "arguments(`r`n            `"-DCMAKE_SUPPRESS_REGENERATION=ON`",`r`n"
    } else {
      $updated = $updated -replace 'def cppArguments = \[\r?\n', "def cppArguments = [`r`n          `"-DCMAKE_SUPPRESS_REGENERATION=ON`",`r`n"
      $updated = $updated -replace 'arguments\(\r?\n', "arguments(`r`n            `"-DCMAKE_SUPPRESS_REGENERATION=ON`",`r`n"
    }

    if ($updated -ne $content) {
      Write-Host "Patching CMake regeneration flag in $gradleFile..." -ForegroundColor Cyan
      Set-Content -Path $gradleFile -Value $updated -NoNewline
    }
  }
}

function Convert-CodegenCMakeGlobsToRelative {
  param([string]$AndroidPackageDir)

  $cmakeFile = Join-Path $AndroidPackageDir 'src\main\jni\CMakeLists.txt'
  if (-not (Test-Path $cmakeFile)) { return }

  $content = Get-Content $cmakeFile -Raw
  $updated = $content -replace 'file\(GLOB ([A-Za-z0-9_]+) CONFIGURE_DEPENDS', 'file(GLOB $1 RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} CONFIGURE_DEPENDS'

  if ($updated -ne $content) {
    Write-Host "Patching relative source globs in $cmakeFile..." -ForegroundColor Cyan
    Set-Content -Path $cmakeFile -Value $updated -NoNewline
  }
}

function Set-DirectoryJunction {
  param(
    [string]$LinkPath,
    [string]$TargetPath
  )

  $root = 'D:\r'
  if (-not $LinkPath.StartsWith($root)) {
    throw "Refusing to manage junction outside $root`: $LinkPath"
  }
  if (-not (Test-Path $TargetPath)) {
    throw "Cannot create junction; target does not exist: $TargetPath"
  }
  if (-not (Test-Path $root)) {
    New-Item -ItemType Directory -Path $root | Out-Null
  }

  if (Test-Path $LinkPath) {
    $item = Get-Item $LinkPath
    $currentTarget = if ($item.LinkType -eq 'Junction') { $item.Target[0] } else { $null }
    if ($currentTarget -eq $TargetPath) { return }
    if ($item.PSIsContainer) {
      cmd /c "rmdir `"$LinkPath`"" | Out-Null
    } else {
      Remove-Item -Force $LinkPath
    }
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to remove existing junction $LinkPath"
    }
  }

  cmd /c "mklink /J `"$LinkPath`" `"$TargetPath`"" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create junction $LinkPath -> $TargetPath"
  }
}

function Convert-AutolinkingCMakeToShortPaths {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Autolinking CMake file was not generated: $Path"
  }

  $shortNames = @{
    'RNDateTimePickerCGen_autolinked_build' = 'dt'
    'RNCNetInfoSpec_autolinked_build' = 'ni'
    'rngesturehandler_codegen_autolinked_build' = 'gh'
    'rnreanimated_autolinked_build' = 're'
    'safeareacontext_autolinked_build' = 'sa'
    'rnscreens_autolinked_build' = 'sc'
    'rnsvg_autolinked_build' = 'sv'
    'rnworklets_autolinked_build' = 'wk'
  }

  $content = Get-Content $Path -Raw
  $updated = $content

  foreach ($buildName in $shortNames.Keys) {
    $pattern = 'add_subdirectory\("([^"]+)" ' + [regex]::Escape($buildName) + '\)'
    $match = [regex]::Match($updated, $pattern)
    if (-not $match.Success) { continue }

    $sourcePath = $match.Groups[1].Value
    if ($sourcePath -notmatch '/node_modules/') { continue }

    $linkPath = Join-Path 'D:\r' $shortNames[$buildName]
    $shortSourcePath = $linkPath -replace '\\', '/'

    if ($sourcePath.EndsWith('/android/src/main/jni/')) {
      $packageRoot = $sourcePath.Substring(0, $sourcePath.Length - '/android/src/main/jni/'.Length)
      Set-DirectoryJunction $linkPath ($packageRoot -replace '/', '\')
      $shortSourcePath = "$shortSourcePath/android/src/main/jni/"
    } else {
      Set-DirectoryJunction $linkPath ($sourcePath -replace '/', '\')
    }

    $updated = $updated.Replace($sourcePath, $shortSourcePath)
  }

  if ($updated -ne $content) {
    Write-Host "Patching short native autolinking paths in $Path..." -ForegroundColor Cyan
    Set-Content -Path $Path -Value $updated -NoNewline
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
$stagingDir = 'D:\c'
if ($env:OS -match 'Windows') {
  if (Test-Path $cxxDir) {
    Write-Host 'Clearing native CMake cache (.cxx)...' -ForegroundColor Cyan
    Remove-Item -Recurse -Force $cxxDir
  }
  if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
  }

  $nativePackages = @(
    'expo-modules-core',
    '@react-native-community/datetimepicker',
    '@react-native-community/netinfo',
    'react-native-gesture-handler',
    'react-native-reanimated',
    'react-native-safe-area-context',
    'react-native-screens',
    'react-native-svg',
    'react-native-worklets'
  )
  Push-Location $mobileDir
  try {
    foreach ($packageName in $nativePackages) {
      $packageJson = (& node --print "require.resolve('$packageName/package.json')" 2>$null)
      if (-not $packageJson) { continue }
      $packageRoot = Split-Path $packageJson -Parent
      $packageAndroid = Join-Path $packageRoot 'android'
      if (Test-Path $packageAndroid) {
        Add-CMakeSuppressRegenerationArgument $packageAndroid
        Convert-CodegenCMakeGlobsToRelative $packageAndroid
      }
      $packageCxx = Join-Path $packageRoot 'android\.cxx'
      $resolvedPackageCxx = if (Test-Path $packageCxx) { (Resolve-Path $packageCxx).Path } else { $null }
      if ($resolvedPackageCxx -and ($resolvedPackageCxx.StartsWith('D:\p\') -or $resolvedPackageCxx.StartsWith('D:\System\PeraKita\p\') -or $resolvedPackageCxx.StartsWith($repoRoot))) {
        Write-Host "Clearing native CMake cache for $packageName..." -ForegroundColor Cyan
        Remove-Item -Recurse -Force $resolvedPackageCxx
      }
    }
  } finally {
    Pop-Location
  }

  $androidGeneratedDirs = @(
    (Join-Path $androidDir '.gradle'),
    (Join-Path $androidDir 'build'),
    (Join-Path $androidDir 'app\build')
  )
  foreach ($generatedDir in $androidGeneratedDirs) {
    if (-not (Test-Path $generatedDir)) { continue }
    $resolvedGeneratedDir = (Resolve-Path $generatedDir).Path
    if (-not $resolvedGeneratedDir.StartsWith($androidDir)) {
      throw "Refusing to clear generated Android directory outside $androidDir`: $resolvedGeneratedDir"
    }
    Write-Host "Clearing generated Android state $resolvedGeneratedDir..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force $resolvedGeneratedDir
  }

  Write-Host 'Generating Android autolinking files for short native paths...' -ForegroundColor Cyan
  Push-Location $androidDir
  try {
    & .\gradlew.bat :app:generateAutolinkingNewArchitectureFiles --no-daemon -g D:\g -PreactNativeArchitectures=arm64-v8a
    if ($LASTEXITCODE -ne 0) {
      throw "Autolinking generation failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
  Convert-AutolinkingCMakeToShortPaths (Join-Path $androidDir 'app\build\generated\autolinking\src\main\jni\Android-autolinking.cmake')
}

Write-Host 'Building release APK with Gradle...'
Push-Location $androidDir
try {
  & .\gradlew.bat assembleRelease --no-daemon -g D:\g -PreactNativeArchitectures=arm64-v8a -x :app:generateAutolinkingNewArchitectureFiles
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
