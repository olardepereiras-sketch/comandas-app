# Script para subir TODOS los archivos necesarios al VPS

Write-Host "🚀 Subiendo archivos al VPS..." -ForegroundColor Cyan
Write-Host ""

$server = "root@200.234.236.133"
$destino = "/var/www/reservamesa/"

Write-Host "📁 Subiendo carpetas principales..." -ForegroundColor Yellow

# Subir carpetas completas
scp -r app $server`:$destino
scp -r lib $server`:$destino
scp -r types $server`:$destino
scp -r constants $server`:$destino
scp -r backend $server`:$destino

Write-Host ""
Write-Host "📄 Subiendo archivos de configuración..." -ForegroundColor Yellow

# Subir archivos de configuración
scp app.json $server`:$destino
scp package.json $server`:$destino
scp bun.lock $server`:$destino
scp tsconfig.json $server`:$destino
scp .env $server`:$destino

Write-Host ""
Write-Host "📜 Subiendo script de deploy..." -ForegroundColor Yellow

# Subir script de deploy
scp deploy-vps-final-correcto.sh $server`:$destino

Write-Host ""
Write-Host "✅ Archivos subidos correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Ahora ejecuta en el servidor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ssh root@200.234.236.133" -ForegroundColor White
Write-Host "   cd /var/www/reservamesa" -ForegroundColor White
Write-Host "   chmod +x deploy-vps-final-correcto.sh" -ForegroundColor White
Write-Host "   bash deploy-vps-final-correcto.sh" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
