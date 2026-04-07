# Script de deploy para ReservaMesa
# Uso: .\deploy.ps1

param(
    [string]$VPS = "200.234.236.133",
    [string]$User = "root",
    [string]$Path = "/var/www/reservamesa"
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   DEPLOY RESERVAMESA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build frontend
Write-Host "[1/6] Construyendo frontend..." -ForegroundColor Yellow
$env:CI = "1"
$env:EXPO_PUBLIC_API_URL = "http://$VPS"
$env:EXPO_PUBLIC_RORK_API_BASE_URL = "http://$VPS"

bun install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en bun install" -ForegroundColor Red
    exit 1
}

bunx expo export --platform web --output-dir dist --clear
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al construir frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend construido" -ForegroundColor Green
Write-Host ""

# 2. Crear lista de archivos a subir
Write-Host "[2/6] Preparando archivos..." -ForegroundColor Yellow
$tempDir = ".\deploy_temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copiar archivos necesarios
Copy-Item -Recurse "dist" "$tempDir\dist"
Copy-Item -Recurse "backend" "$tempDir\backend"
Copy-Item ".env" "$tempDir\.env" -ErrorAction SilentlyContinue
Copy-Item "package.json" "$tempDir\package.json"
Copy-Item "bun.lock" "$tempDir\bun.lock"

Write-Host "✓ Archivos preparados" -ForegroundColor Green
Write-Host ""

# 3. Comprimir
Write-Host "[3/6] Comprimiendo archivos..." -ForegroundColor Yellow
$zipFile = ".\deploy.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile
Remove-Item -Recurse -Force $tempDir
Write-Host "✓ Archivos comprimidos" -ForegroundColor Green
Write-Host ""

# 4. Subir al VPS
Write-Host "[4/6] Subiendo al VPS..." -ForegroundColor Yellow
scp $zipFile "${User}@${VPS}:/tmp/deploy.zip"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al subir archivos. ¿Tienes configurada la clave SSH?" -ForegroundColor Red
    exit 1
}
Remove-Item $zipFile
Write-Host "✓ Archivos subidos" -ForegroundColor Green
Write-Host ""

# 5. Descomprimir y preparar en el VPS
Write-Host "[5/6] Preparando en VPS..." -ForegroundColor Yellow
$sshCommands = @"
cd $Path &&
unzip -o /tmp/deploy.zip &&
rm /tmp/deploy.zip &&
bun install --production &&
echo '✓ Archivos desplegados'
"@

ssh "${User}@${VPS}" $sshCommands
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al preparar en VPS" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Preparado en VPS" -ForegroundColor Green
Write-Host ""

# 6. Reiniciar servidor
Write-Host "[6/6] Reiniciando servidor..." -ForegroundColor Yellow
$restartCommands = @"
pkill -f 'bun.*server.ts' 2>/dev/null || true &&
cd $Path &&
nohup bun --env-file .env backend/server.ts > /var/log/reservamesa.log 2>&1 &
sleep 2 &&
ps aux | grep 'bun.*server.ts' | grep -v grep && echo '✓ Servidor iniciado' || echo '✗ Error al iniciar servidor'
"@

ssh "${User}@${VPS}" $restartCommands
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend: http://$VPS" -ForegroundColor White
Write-Host "📡 API: http://$VPS/api/trpc" -ForegroundColor White
Write-Host "📊 Health: http://$VPS/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Yellow
Write-Host "  ssh ${User}@${VPS} 'tail -f /var/log/reservamesa.log'" -ForegroundColor Gray
Write-Host ""
