$ErrorActionPreference = "Continue"
$Host.UI.RawUI.WindowTitle = "BUILD APK DEFINITIVO v9.0"
Write-Host "=== BUILD APK DEFINITIVO v9.0 ===" -ForegroundColor Yellow
Write-Host "Fix definitivo: --no-build-cache + caching=false resuelve metadata.bin" -ForegroundColor Cyan

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
# PASO 2: Limpiar COMPLETO - proyecto Y caches Gradle
# CRITICO: Eliminar transforms evita el error metadata.bin
# ============================================================
Write-Host "`n=== PASO 2: Limpiando proyecto y caches Gradle ===" -ForegroundColor Cyan
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .gradle -ErrorAction SilentlyContinue

# Limpiar TODA la cache Gradle del usuario (incluyendo transforms corruptos)
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\daemon" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\build-scan-data" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\configuration-cache" -ErrorAction SilentlyContinue

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
# PASO 6: PARCHE CRITICO - ReactNativeFeatureFlags.kt
# enableBridgelessArchitecture eliminado en RN 0.76+
# ============================================================
Write-Host "`n=== PASO 6: Parcheando ReactNativeFeatureFlags.kt ===" -ForegroundColor Cyan
$flagsFile = "$PWD\node_modules\expo-modules-core\android\src\main\java\expo\modules\rncompatibility\ReactNativeFeatureFlags.kt"
if (Test-Path $flagsFile) {
    $flagsPatch = "package expo.modules.rncompatibility`n`nobject ReactNativeFeatureFlags {`n  val enableBridgelessArchitecture: Boolean = false`n}`n"
    [System.IO.File]::WriteAllText($flagsFile, $flagsPatch, [System.Text.UTF8Encoding]::new($false))
    if ((Get-Content $flagsFile -Raw) -match 'enableBridgelessArchitecture: Boolean = false') {
        Write-Host "  ReactNativeFeatureFlags.kt parcheado OK" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Parche ReactNativeFeatureFlags.kt FALLO!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ReactNativeFeatureFlags.kt no encontrado (no necesario)" -ForegroundColor Yellow
}

# ============================================================
# PASO 7: PARCHE CRITICO - CSSProps.kt
# BoxShadow.parse() en RN 0.76 solo acepta (ReadableMap), no (ReadableMap, Context)
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
        Write-Host "  CSSProps.kt - patron BoxShadow no encontrado (verificando linea 146)..." -ForegroundColor Yellow
        $cssLines | Select-Object -Index 143,144,145,146,147 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
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
# ============================================================
Write-Host "`n=== PASO 9: Verificando y re-aplicando parches post-prebuild ===" -ForegroundColor Cyan

if (Test-Path $flagsFile) {
    $checkFlags = Get-Content $flagsFile -Raw
    if (-not ($checkFlags -match 'enableBridgelessArchitecture: Boolean = false')) {
        Write-Host "  Re-aplicando parche ReactNativeFeatureFlags.kt..." -ForegroundColor Yellow
        $flagsPatch = "package expo.modules.rncompatibility`n`nobject ReactNativeFeatureFlags {`n  val enableBridgelessArchitecture: Boolean = false`n}`n"
        [System.IO.File]::WriteAllText($flagsFile, $flagsPatch, [System.Text.UTF8Encoding]::new($false))
        Write-Host "  Re-parche OK" -ForegroundColor Green
    } else {
        Write-Host "  ReactNativeFeatureFlags.kt intacto OK" -ForegroundColor Green
    }
}

if (Test-Path $cssPropsFile) {
    $checkCss = Get-Content $cssPropsFile
    $cssLinesOut2 = @()
    $cssNeedsRepatch = $false
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
if ((Get-Content $buildGradlePath -Raw) -match 'enableBundleCompression') {
    Write-Host "ERROR CRITICO: enableBundleCompression NO eliminado!" -ForegroundColor Red
    exit 1
}
Write-Host "android/app/build.gradle OK" -ForegroundColor Green

# ============================================================
# PASO 11: Gradle wrapper 8.10.2
# ============================================================
Write-Host "`n=== PASO 11: Configurando Gradle wrapper 8.10.2 ===" -ForegroundColor Cyan
$gradleWrapperDir = "$PWD\android\gradle\wrapper"
if (-not (Test-Path $gradleWrapperDir)) {
    New-Item -ItemType Directory -Path $gradleWrapperDir -Force | Out-Null
}
$wrapperContent = "distributionBase=GRADLE_USER_HOME`ndistributionPath=wrapper/dists`ndistributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip`nnetworkTimeout=10000`nvalidateDistributionUrl=true`nzipStoreBase=GRADLE_USER_HOME`nzipStorePath=wrapper/dists`n"
[System.IO.File]::WriteAllText("$gradleWrapperDir\gradle-wrapper.properties", $wrapperContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Gradle wrapper 8.10.2 OK" -ForegroundColor Green

# ============================================================
# PASO 12: gradle.properties
# CRITICO: org.gradle.caching=false evita metadata.bin corrupto
# CRITICO: org.gradle.parallel=false evita race conditions
# ============================================================
Write-Host "`n=== PASO 12: Configurando gradle.properties ===" -ForegroundColor Cyan
$gradlePropertiesPath = "$PWD\android\gradle.properties"
$gpContent = Get-Content $gradlePropertiesPath -Raw
$gpContent = $gpContent -replace '(?m)^android\.kotlinVersion=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^kotlinVersion=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.jvmargs=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.parallel=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.caching=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.configureondemand=.*\r?\n?', ''
$gpContent = $gpContent -replace '(?m)^org\.gradle\.configuration-cache=.*\r?\n?', ''
$gpContent = $gpContent.TrimEnd() + "`nandroid.kotlinVersion=2.0.21`norg.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError`norg.gradle.parallel=false`norg.gradle.caching=false`norg.gradle.configureondemand=false`norg.gradle.configuration-cache=false`n"
[System.IO.File]::WriteAllText($gradlePropertiesPath, $gpContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "gradle.properties OK (caching=false, parallel=false)" -ForegroundColor Green

# ============================================================
# PASO 13: local.properties
# ============================================================
Write-Host "`n=== PASO 13: Configurando local.properties ===" -ForegroundColor Cyan
[System.IO.File]::WriteAllText("$PWD\android\local.properties", "sdk.dir=C:\\Users\\olard\\AppData\\Local\\Android\\Sdk`n", [System.Text.UTF8Encoding]::new($false))
Write-Host "local.properties OK" -ForegroundColor Green

# ============================================================
# PASO 14: Limpiar transforms JUSTO ANTES del build
# Asegura que no haya metadata.bin corruptos de builds anteriores
# ============================================================
Write-Host "`n=== PASO 14: Limpiando transforms Gradle pre-build ===" -ForegroundColor Cyan
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\8.10.2\transforms" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\transforms-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\build-cache-*" -ErrorAction SilentlyContinue
Write-Host "Limpieza transforms OK" -ForegroundColor Green

# ============================================================
# PASO 15: Verificacion final
# ============================================================
Write-Host "`n=== PASO 15: Verificacion final ===" -ForegroundColor Cyan
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
        if ($line -match 'BoxShadow\.parse\(' -and $line -match ',\s*view\.context') { $cssStillBad = $true }
    }
    if ($cssStillBad) {
        Write-Host "  [FALLO] CSSProps.kt NO parcheado!" -ForegroundColor Red; $allOk = $false
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
if ($gpCheck -match 'org\.gradle\.parallel=false') {
    Write-Host "  [OK] parallel=false" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] parallel no desactivado!" -ForegroundColor Red; $allOk = $false
}
if ($gpCheck -match 'org\.gradle\.caching=false') {
    Write-Host "  [OK] caching=false (fix metadata.bin)" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] caching no desactivado!" -ForegroundColor Red; $allOk = $false
}

$pkgCheck = Get-Content "$PWD\package.json" -Raw
if ($pkgCheck -match 'expo-linking') {
    Write-Host "  [OK] expo-linking en package.json" -ForegroundColor Green
} else {
    Write-Host "  [FALLO] expo-linking NO en package.json!" -ForegroundColor Red; $allOk = $false
}

if (-not $allOk) {
    Write-Host "`nVERIFICACION FALLIDA - abortando build" -ForegroundColor Red
    exit 1
}
Write-Host "Todas las verificaciones OK" -ForegroundColor Green

# ============================================================
# PASO 16: Compilar APK
# CRITICO: --no-build-cache es la solucion definitiva para metadata.bin
# --no-parallel: evita race conditions en transforms
# --rerun-tasks: fuerza re-ejecucion sin cache
# ============================================================
Write-Host "`n=== PASO 16: Compilando APK ===" -ForegroundColor Cyan
Set-Location android
& .\gradlew.bat --stop 2>$null
& .\gradlew.bat assembleRelease --no-daemon --no-parallel --no-build-cache --rerun-tasks --max-workers=2 2>&1 | Tee-Object -FilePath "..\build.log"
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
