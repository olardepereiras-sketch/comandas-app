# Colores para output (PowerShell)
$VPS = "root@200.234.236.133"
$REMOTE_DIR = "/var/www/reservamesa"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║    Desplegando correcciones de serialización              ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Lista de archivos a copiar
$FILES = @(
  "types/index.ts",
  "backend/trpc/routes/locations/create-province/route.ts",
  "backend/trpc/routes/locations/create-city/route.ts",
  "backend/trpc/routes/locations/list/route.ts",
  "backend/trpc/routes/locations/update-province/route.ts",
  "backend/trpc/routes/locations/update-city/route.ts"
)

$TOTAL = $FILES.Count
$CURRENT = 0

Write-Host "📦 Copiando archivos al VPS..." -ForegroundColor Yellow
Write-Host ""

# Copiar cada archivo
foreach ($file in $FILES) {
  $CURRENT++
  Write-Host "[$CURRENT/$TOTAL] Copiando: " -NoNewline -ForegroundColor Blue
  Write-Host "$file" -ForegroundColor Green
  
  $scpCommand = "scp `"$file`" `"${VPS}:${REMOTE_DIR}/$file`""
  $result = Invoke-Expression $scpCommand 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "         ✓ OK" -ForegroundColor Green
  } else {
    Write-Host "         ✗ ERROR" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "🔄 Reiniciando aplicación en el VPS..." -ForegroundColor Yellow

# Reiniciar la aplicación
$restartCommand = "ssh $VPS `"cd $REMOTE_DIR && pm2 restart quieromesa`""
$result = Invoke-Expression $restartCommand 2>&1

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Aplicación reiniciada correctamente" -ForegroundColor Green
} else {
  Write-Host "❌ Error al reiniciar la aplicación" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "⏳ Esperando 3 segundos para que la aplicación inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║                   LOGS DE LA APLICACIÓN                    ║" -ForegroundColor Blue
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Mostrar últimos logs
$logsCommand = "ssh $VPS `"pm2 logs quieromesa --lines 20 --nostream`""
Invoke-Expression $logsCommand

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ DESPLIEGUE COMPLETADO                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Ve a: " -NoNewline -ForegroundColor Yellow
Write-Host "http://200.234.236.133/admin/restaurants" -ForegroundColor Blue
Write-Host "  2. Intenta crear un nuevo restaurante" -ForegroundColor Yellow
Write-Host "  3. Verifica que funcione correctamente" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ver logs en tiempo real:" -ForegroundColor Yellow
Write-Host "  ssh $VPS `"cd $REMOTE_DIR && pm2 logs quieromesa`"" -ForegroundColor Blue
Write-Host ""
