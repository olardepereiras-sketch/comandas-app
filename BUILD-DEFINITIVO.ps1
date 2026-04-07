$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "BUILD APK DEFINITIVO v11.0"
Write-Host "=== BUILD APK DEFINITIVO v11.0 ===" -ForegroundColor Yellow
Write-Host "Gradle 8.8 - compatible con expo-modules-autolinking Y sin bug metadata.bin" -ForegroundColor Cyan

# ============================================================
# PASO 1: Terminar procesos
# ============================================================
Write-Host "`n=== PASO 1: Terminando procesos ===" -ForegroundColor Cyan
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null
taskkill /F /IM gradle.exe /T 2>$null
Start-Sleep -Seconds 3
Write-Host "Procesos terminados OK" -ForegroundColor Green

# ============================================================
# PASO 2: Limpiar proyecto y TODOS los caches Gradle
# ============================================================
Write-Host "`n=== PASO 2: Limpiando proyecto y caches Gradle ===" -ForegroundColor Cyan
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\daemon" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\wrapper\dists" -ErrorAction SilentlyContinue
Write-Host "Limpieza OK" -ForegroundColor Green

# ============================================================
# PASO 3: package.json sin BOM
# ============================================================
Write-Host "`n=== PASO 3: Escribiendo package.json ===" -ForegroundColor Cyan
$packageJson = @'
{
  "name": "comandas-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:web": "expo export --platform web"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.0.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@tanstack/react-query": "^4.36.1",
    "@trpc/client": "^10.45.2",
    "@trpc/react-query": "^10.45.2",
    "@trpc/server": "^10.45.2",
    "expo": "~54.0.0",
    "expo-linking": "~7.0.5",
    "expo-router": "~4.0.17",
    "expo-splash-screen": "~0.29.24",
    "expo-status-bar": "~2.0.1",
    "lucide-react-native": "^0.462.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-native": "0.76.7",
    "react-native-gesture-handler": "~2.21.2",
    "react-native-safe-area-context": "4.14.0",
    "react-native-screens": "~4.4.0",
    "react-native-svg": "15.8.0",
    "react-native-tcp-socket": "^6.0.6",
    "react-native-web": "~0.19.13",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "typescript": "^5.3.3"
  }
}
'@
[System.IO.File]::WriteAllText("$PWD\package.json", $packageJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "package.json OK" -ForegroundColor Green

# ============================================================
# PASO 4: app.json sin BOM
# ============================================================
Write-Host "`n=== PASO 4: Escribiendo app.json ===" -ForegroundColor Cyan
$appJson = @'
{
  "expo": {
    "name": "Comandas",
    "slug": "comandas-app",
    "version": "1.0.0",
    "orientation": "default",
    "scheme": "comandas",
    "userInterfaceStyle": "light",
    "newArchEnabled": false,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.quieromesa.comandas"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#F97316"
      },
      "package": "com.quieromesa.comandas"
    },
    "web": {
      "bundler": "metro",
      "output": "server",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
'@
[System.IO.File]::WriteAllText("$PWD\app.json", $appJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "app.json OK (newArchEnabled: false)" -ForegroundColor Green

# ============================================================
# PASO 5: npm install
# ============================================================
Write-Host "`n=== PASO 5: npm install ===" -ForegroundColor Cyan
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en npm install" -ForegroundColor Red; exit 1 }
Write-Host "npm install OK" -ForegroundColor Green

# ============================================================
# PASO 6: PARCHE - ReactNativeFeatureFlags.kt
# ============================================================
Write-Host "`n=== PASO 6: Parcheando ReactNativeFeatureFlags.kt ===" -ForegroundColor Cyan
$flagsFile = "$PWD\node_modules\expo-modules-core\android\src\main\java\expo\modules\rncompatibility\ReactNativeFeatureFlags.kt"
if (Test-Path $flagsFile) {
    $flagsPatch = "package expo.modules.rncompatibility`n`nobject ReactNativeFeatureFlags {`n  val enableBridgelessArchitecture: Boolean = false`n}`n"
    [System.IO.File]::WriteAllText($flagsFile, $flagsPatch, [System.Text.UTF8Encoding]::new($false))
    $verify = Get-Content $flagsFile -Raw
    if ($verify -match 'enableBridgelessArchitecture: Boolean = false') {
        Write-Host "  ReactNativeFeatureFlags.kt parcheado OK" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Parche ReactNativeFeatureFlags.kt FALLO!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ReactNativeFeatureFlags.kt no encontrado (no necesario)" -ForegroundColor Yellow
}

# ============================================================
# PASO 7: PARCHE - CSSProps.kt
# BoxShadow.parse() en RN 0.76 solo acepta (ReadableMap)
# ============================================================
Write-Host "`n=== PASO 7: Parcheando CSSProps.kt ===" -ForegroundColor Cyan
$cssPropsFile = "$PWD\node_modules\expo-modules-core\android\src\main\java\expo\modules\kotlin\views\decorators\CSSProps.kt"
if (Test-Path $cssPropsFile) {
    $cssLines = Get-Content $cssPropsFile
    $patched = $false
    $cssLinesOut = @()
    foreach ($line in $cssLines) {
        if ($line -match 'BoxShadow\.parse\(' -and $line -match ',\s*view\.context') {
            $newLine = $line -replace ',\s*view\.context', ''
            $cssLinesOut += $newLine
            Write-Host "  Linea parcheada: $newLine" -ForegroundColor Green
            $patched = $true
        } else {
            $cssLinesOut += $line
        }
    }
    if ($patched) {
        [System.IO.File]::WriteAllLines($cssPropsFile, $cssLinesOut, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  CSSProps.kt parcheado OK" -ForegroundColor Green
    } else {
        Write-Host "  CSSProps.kt - parche no necesario (ya correcto)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  CSSProps.kt no encontrado (no necesario)" -ForegroundColor Yellow
}

# ============================================================
# PASO 8: expo prebuild
# ============================================================
Write-Host "`n=== PASO 8: expo prebuild ===" -ForegroundColor Cyan
$env:EXPO_NO_GIT_STATUS = "1"
$env:NODE_ENV = "production"
echo "yes" | npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR en expo prebuild" -ForegroundColor Red; exit 1 }
Write-Host "expo prebuild OK" -ForegroundColor Green

# ============================================================
# PASO 9: Re-aplicar parches post-prebuild
# (prebuild puede resetear node_modules en algunos casos)
# ============================================================
Write-Host "`n=== PASO 9: Re-aplicando parches post-prebuild ===" -ForegroundColor Cyan

if (Test-Path $flagsFile) {
    $checkFlags = Get-Content $flagsFile -Raw
    if (-not ($checkFlags -match 'enableBridgelessArchitecture: Boolean = false')) {
        $flagsPatch = "package expo.modules.rncompatibility`n`nobject ReactNativeFeatureFlags {`n  val enableBridgelessArchitecture: Boolean = false`n}`n"
        [System.IO.File]::WriteAllText($flagsFile, $flagsPatch, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  ReactNativeFeatureFlags.kt re-parcheado OK" -ForegroundColor Green
    } else {
        Write-Host "  ReactNativeFeatureFlags.kt intacto OK" -ForegroundColor Green
    }
}

if (Test-Path $cssPropsFile) {
    $checkCss = Get-Content $cssPropsFile
    $cssNeedsRepatch = $false
    $cssLinesOut2 = @()
    foreach ($line in $checkCss) {
        if ($line -match 'BoxShadow\.parse\(' -and $line -match ',\s*view\.context') {
            $cssLinesOut2 += ($line -replace ',\s*view\.context', '')
            $cssNeedsRepatch = $true
        } else {
            $cssLinesOut2 += $line
        }
    }
    if ($cssNeedsRepatch) {
        [System.IO.File]::WriteAllLines($cssPropsFile, $cssLinesOut2, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  CSSProps.kt re-parcheado OK" -ForegroundColor Green
    } else {
        Write-Host "  CSSProps.kt intacto OK" -ForegroundColor Green
    }
}

# ============================================================
# PASO 10: Parchear android/app/build.gradle
# ============================================================
Write-Host "`n=== PASO 10: Parcheando android/app/build.gradle ===" -ForegroundColor Cyan
$buildGradlePath = "$PWD\android\app\build.gradle"
if (-not (Test-Path $buildGradlePath)) {
    Write-Host "ERROR: No existe $buildGradlePath" -ForegroundColor Red
    exit 1
}
$bgContent = Get-Content $buildGradlePath -Raw
$bgContent = $bgContent -replace '(?m)^[^\r\n]*enableBundleCompression[^\r\n]*\r?\n?', ''
[System.IO.File]::WriteAllText($buildGradlePath, $bgContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "android/app/build.gradle OK" -ForegroundColor Green

# ============================================================
# PASO 11: Gradle wrapper 8.8
# - Gradle 8.6: demasiado antiguo, expo-modules-autolinking falla
# - Gradle 8.10.x: bug metadata.bin en Windows
# - Gradle 8.8: compatible con autolinking Y sin bug metadata.bin
# ============================================================
Write-Host "`n=== PASO 11: Configurando Gradle wrapper 8.8 ===" -ForegroundColor Cyan
$gradleWrapperDir = "$PWD\android\gradle\wrapper"
if (-not (Test-Path $gradleWrapperDir)) {
    New-Item -ItemType Directory -Path $gradleWrapperDir -Force | Out-Null
}
$wrapperContent = "distributionBase=GRADLE_USER_HOME`ndistributionPath=wrapper/dists`ndistributionUrl=https\://services.gradle.org/distributions/gradle-8.8-bin.zip`nnetworkTimeout=10000`nvalidateDistributionUrl=true`nzipStoreBase=GRADLE_USER_HOME`nzipStorePath=wrapper/dists`n"
[System.IO.File]::WriteAllText("$gradleWrapperDir\gradle-wrapper.properties", $wrapperContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Gradle wrapper 8.8 OK" -ForegroundColor Green

# ============================================================
# PASO 12: gradle.properties
# ============================================================
Write-Host "`n=== PASO 12: Configurando gradle.properties ===" -ForegroundColor Cyan
$gradlePropertiesPath = "$PWD\android\gradle.properties"
$gpContent = Get-Content $gradlePropertiesPath -Raw
$gpContent = $gpContent -replace '(?m)^android\.kotlinVersion=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^kotlinVersion=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.jvmargs=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.parallel=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.configureondemand=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.caching=.*\r?\n?', ''
$gpContent = $gpContent.TrimEnd() + "`nandroid.kotlinVersion=2.0.21`norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g`norg.gradle.parallel=false`norg.gradle.configureondemand=false`norg.gradle.caching=false`n"
[System.IO.File]::WriteAllText($gradlePropertiesPath, $gpContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "gradle.properties OK (kotlin=2.0.21, parallel=false, caching=false)" -ForegroundColor Green

# ============================================================
# PASO 13: local.properties
# ============================================================
Write-Host "`n=== PASO 13: Configurando local.properties ===" -ForegroundColor Cyan
[System.IO.File]::WriteAllText("$PWD\android\local.properties", "sdk.dir=C:\\Users\\olard\\AppData\\Local\\Android\\Sdk`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "local.properties OK" -ForegroundColor Green

# ============================================================
# PASO 14: Verificacion final
# ============================================================
Write-Host "`n=== PASO 14: Verificacion final ===" -ForegroundColor Cyan
$allOk = $true

if ((Get-Content $buildGradlePath -Raw) -match 'enableBundleCompression') {
    Write-Host "  [FALLO] enableBundleCompression presente!" -ForegroundColor Red; $allOk = $false
} else {
    Write-Host "  [OK] enableBundleCompression AUSENTE" -ForegroundColor Green
}

if (Test-Path $flagsFile) {
    if ((Get-Content $flagsFile -Raw) -match 'enableBridgelessArchitecture: Boolean = false') {
        Write-Host "  [OK] ReactNativeFeatureFlags.kt parcheado" -ForegroundColor Green
    } else {
        Write-Host "  [FALLO] ReactNativeFeatureFlags.kt NO parcheado!" -ForegroundColor Red; $allOk = $false
    }
} else {
    Write-Host "  [OK] ReactNativeFeatureFlags.kt no existe (no necesario)" -ForegroundColor Green
}

if (Test-Path $cssPropsFile) {
    $cssCheck = Get-Content $cssPropsFile
    $cssStillBad = $false
    foreach ($line in $cssCheck) {
        if ($line -match 'BoxShadow\.parse\(' -and $line -match ',\s*view\.context') {
            $cssStillBad = $true
        }
    }
    if ($cssStillBad) {
        Write-Host "  [FALLO] CSSProps.kt BoxShadow.parse NO parcheado!" -ForegroundColor Red; $allOk = $false
    } else {
        Write-Host "  [OK] CSSProps.kt parcheado" -ForegroundColor Green
    }
} else {
    Write-Host "  [OK] CSSProps.kt no existe (no necesario)" -ForegroundColor Green
}

$gpCheck = Get-Content $gradlePropertiesPath -Raw
if ($gpCheck -match 'android\.kotlinVersion=2\.0\.21') {
    Write-Host "  [OK] kotlinVersion=2.0.21" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] kotlinVersion no configurado!" -ForegroundColor Red; $allOk = $false
}

$wrapperCheck = Get-Content "$gradleWrapperDir\gradle-wrapper.properties" -Raw
if ($wrapperCheck -match 'gradle-8\.8-bin') {
    Write-Host "  [OK] Gradle 8.8 configurado" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] Gradle 8.8 NO configurado!" -ForegroundColor Red; $allOk = $false
}

$pkgCheck = Get-Content "$PWD\package.json" -Raw
if ($pkgCheck -match 'expo-linking') {
    Write-Host "  [OK] expo-linking en package.json" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] expo-linking NO esta en package.json!" -ForegroundColor Red; $allOk = $false
}

if (-not $allOk) {
    Write-Host "`nVERIFICACION FALLIDA - abortando build" -ForegroundColor Red
    exit 1
}
Write-Host "Todas las verificaciones OK" -ForegroundColor Green

# ============================================================
# PASO 15: Compilar APK
# ============================================================
Write-Host "`n=== PASO 15: Compilando APK ===" -ForegroundColor Cyan
Set-Location android
& .\gradlew.bat --stop 2>$null
& .\gradlew.bat assembleRelease --no-daemon --no-parallel --no-build-cache 2>&1 | Tee-Object -FilePath "..\build.log"
$buildResult = $LASTEXITCODE
Set-Location ..

if ($buildResult -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  BUILD EXITOSO!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    $apkPath = Get-ChildItem -Recurse -Path "android\app\build\outputs\apk\release\*.apk" -ErrorAction SilentlyContinue
    if ($apkPath) {
        Write-Host "APK: $($apkPath.FullName)" -ForegroundColor Green
        Write-Host "Tamano: $([math]::Round($apkPath.Length / 1MB, 2)) MB" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "BUILD FALLIDO - revisa build.log" -ForegroundColor Red
    Write-Host "Ultimas 60 lineas de build.log:" -ForegroundColor Yellow
    if (Test-Path "build.log") {
        Get-Content "build.log" -Tail 60
    }
}
