# ============================================================
#  BUILD-APK.ps1  -  Script definitivo para compilar APK
#  Copia este archivo a C:\comandas-app\comandas-app\ y ejecuta:
#  powershell -ExecutionPolicy Bypass -File BUILD-APK.ps1
# ============================================================

$ErrorActionPreference = "Continue"
$sdkPath = "C:\Users\olard\AppData\Local\Android\Sdk"

Write-Host "=== PASO 1: Terminando procesos ===" -ForegroundColor Cyan
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null
taskkill /F /IM gradle.exe /T 2>$null
Start-Sleep -Seconds 2

Write-Host "=== PASO 2: Limpiando directorios ===" -ForegroundColor Cyan
Remove-Item -Recurse -Force android -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches" -ErrorAction SilentlyContinue

Write-Host "=== PASO 3: Configurando package.json con versiones correctas ===" -ForegroundColor Cyan
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json

$pkg.dependencies.expo                                          = "~54.0.0"
$pkg.dependencies.'expo-router'                                 = "~4.0.17"
$pkg.dependencies.'expo-splash-screen'                          = "~0.29.24"
$pkg.dependencies.'expo-status-bar'                             = "~2.0.1"
$pkg.dependencies.react                                         = "18.3.1"
$pkg.dependencies.'react-dom'                                   = "18.3.1"
$pkg.dependencies.'react-native'                                = "0.76.7"
$pkg.dependencies.'react-native-gesture-handler'                = "~2.21.2"
$pkg.dependencies.'react-native-safe-area-context'              = "4.12.0"
$pkg.dependencies.'react-native-screens'                        = "~4.4.0"
$pkg.dependencies.'react-native-web'                            = "~0.19.13"
$pkg.dependencies.'@expo/vector-icons'                          = "^14.0.0"
$pkg.dependencies.'@react-native-async-storage/async-storage'   = "1.23.1"
$pkg.devDependencies.'@types/react'                             = "~18.3.12"

$pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
Write-Host "  package.json actualizado" -ForegroundColor Green

Write-Host "=== PASO 4: Instalando dependencias ===" -ForegroundColor Cyan
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en npm install" -ForegroundColor Red
    exit 1
}

Write-Host "=== PASO 5: Ejecutando expo prebuild ===" -ForegroundColor Cyan
$env:CI = "1"
npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR en expo prebuild" -ForegroundColor Red
    exit 1
}

Write-Host "=== PASO 6: Parcheando android/app/build.gradle ===" -ForegroundColor Cyan
$appBuildGradle = "android\app\build.gradle"
if (Test-Path $appBuildGradle) {
    $content = Get-Content $appBuildGradle -Raw

    # Eliminar enableBundleCompression (propiedad eliminada en RN 0.76)
    $content = $content -replace '\s*enableBundleCompression\s*=\s*(true|false)\s*\n?', "`n"
    $content = $content -replace '\s*enableBundleCompression\s*=\s*(true|false)', ''

    Set-Content $appBuildGradle -Value $content -Encoding UTF8 -NoNewline
    Write-Host "  enableBundleCompression eliminado correctamente" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: No se encontro android\app\build.gradle" -ForegroundColor Yellow
}

Write-Host "=== PASO 7: Configurando Gradle wrapper (8.10.2) ===" -ForegroundColor Cyan
$gradleWrapperProps = @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"@
Set-Content "android\gradle\wrapper\gradle-wrapper.properties" -Value $gradleWrapperProps -Encoding UTF8
Write-Host "  gradle-wrapper.properties configurado" -ForegroundColor Green

Write-Host "=== PASO 8: Configurando kotlinVersion en gradle.properties ===" -ForegroundColor Cyan
$gradleProps = Get-Content "android\gradle.properties" -Raw

# Eliminar cualquier version de kotlin previa
$gradleProps = $gradleProps -replace 'kotlinVersion=.*\n?', ''
$gradleProps = $gradleProps -replace 'android\.kotlinVersion=.*\n?', ''

# Agregar la version correcta al final
$gradleProps = $gradleProps.TrimEnd() + "`nkotlinVersion=2.0.21`n"

Set-Content "android\gradle.properties" -Value $gradleProps -Encoding UTF8 -NoNewline
Write-Host "  kotlinVersion=2.0.21 configurado" -ForegroundColor Green

Write-Host "=== PASO 9: Configurando local.properties ===" -ForegroundColor Cyan
Set-Content "android\local.properties" -Value "sdk.dir=$($sdkPath.Replace('\','\\'))" -Encoding UTF8
Write-Host "  local.properties configurado: $sdkPath" -ForegroundColor Green

Write-Host "=== PASO 10: Deteniendo daemons Gradle ===" -ForegroundColor Cyan
Push-Location android
.\gradlew --stop 2>$null
Pop-Location

Write-Host "=== PASO 11: Compilando APK Release ===" -ForegroundColor Cyan
Push-Location android
.\gradlew assembleRelease --no-daemon --stacktrace
$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -eq 0) {
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  APK GENERADA CORRECTAMENTE!" -ForegroundColor Green
        Write-Host "  Ruta: $apkPath" -ForegroundColor Green
        Write-Host "  Tamano: $apkSize MB" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  BUILD FALLIDO - Revisa los errores arriba" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    exit 1
}
