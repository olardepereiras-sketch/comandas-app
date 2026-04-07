# Script PowerShell para desplegar corrección de esquema de horarios

Write-Host "🚀 Desplegando corrección de esquema de horarios..." -ForegroundColor Green

$VPS_USER = "root"
$VPS_HOST = "200.234.236.133"
$VPS_DIR = "/root/rork-app"

Write-Host "📦 Subiendo archivos al VPS..." -ForegroundColor Yellow
scp backend/db/fix-schedules-schema.ts ${VPS_USER}@${VPS_HOST}:${VPS_DIR}/backend/db/

Write-Host "🔧 Ejecutando migración en el VPS..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_HOST} @"
cd /root/rork-app

echo '🔄 Compilando script de migración...'
bun backend/db/fix-schedules-schema.ts

echo '🔄 Reiniciando servidor...'
pm2 restart rork-app

echo '✅ Migración completada!'
"@

Write-Host "🎉 Despliegue completado exitosamente!" -ForegroundColor Green
