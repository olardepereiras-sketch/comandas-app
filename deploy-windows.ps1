# Script de Deploy para ReservaMesa
# Ejecutar desde Windows con PowerShell

param(
    [string]$VpsIp = "200.234.236.133",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/var/www/reservamesa"
)

Write-Host "🚀 DEPLOY DE RESERVAMESA AL VPS" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Paso 1: Construir frontend localmente
Write-Host "📦 PASO 1: Construyendo frontend..." -ForegroundColor Yellow
$env:CI = "1"
$env:EXPO_PUBLIC_API_URL = "http://$VpsIp"
$env:EXPO_PUBLIC_RORK_API_BASE_URL = "http://$VpsIp"

bunx expo export --platform web --output-dir dist

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir frontend" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend construido`n" -ForegroundColor Green

# Paso 2: Crear archivo temporal con archivos a subir
Write-Host "📦 PASO 2: Preparando archivos..." -ForegroundColor Yellow

$filesToUpload = @(
    "dist/*",
    "backend/**/*.ts",
    ".env",
    "package.json",
    "bun.lock",
    "tsconfig.json"
)

Write-Host "✅ Archivos preparados`n" -ForegroundColor Green

# Paso 3: Instrucciones para WinSCP o similar
Write-Host "`n📋 INSTRUCCIONES PARA SUBIR ARCHIVOS:" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan
Write-Host "Usa WinSCP, FileZilla o scp para subir:" -ForegroundColor White
Write-Host "  - Carpeta 'dist/' completa → $VpsPath/dist/" -ForegroundColor Yellow
Write-Host "  - Carpeta 'backend/' completa → $VpsPath/backend/" -ForegroundColor Yellow
Write-Host "  - Archivo '.env' → $VpsPath/.env" -ForegroundColor Yellow
Write-Host "  - Archivo 'package.json' → $VpsPath/package.json" -ForegroundColor Yellow
Write-Host "  - Archivo 'bun.lock' → $VpsPath/bun.lock" -ForegroundColor Yellow

Write-Host "`n⏭️  Después de subir, ejecuta los comandos del siguiente script en el VPS" -ForegroundColor Cyan
Write-Host "Ver: comandos-vps.sh`n" -ForegroundColor Yellow
