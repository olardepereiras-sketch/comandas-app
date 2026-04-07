# Script para subir archivos necesarios al VPS
# Ejecutar desde PowerShell en C:\app

$VPS = "root@200.234.236.133"
$DESTINO = "/var/www/reservamesa"

Write-Host "🚀 SUBIENDO ARCHIVOS AL VPS" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""

# Lista de archivos a subir
$archivos = @(
    @{ Archivo = "lib/trpc.ts"; Requerido = $true },
    @{ Archivo = "app/_layout.tsx"; Requerido = $true },
    @{ Archivo = "app/index.tsx"; Requerido = $true },
    @{ Archivo = "app/+not-found.tsx"; Requerido = $false },
    @{ Archivo = "backend/trpc/app-router.ts"; Requerido = $true },
    @{ Archivo = "backend/server.ts"; Requerido = $true },
    @{ Archivo = "package.json"; Requerido = $true },
    @{ Archivo = "tsconfig.json"; Requerido = $false },
    @{ Archivo = "deploy-completo-fixed.sh"; Requerido = $true }
)

$errores = 0
$exitosos = 0

foreach ($item in $archivos) {
    $archivo = $item.Archivo
    $requerido = $item.Requerido
    
    Write-Host "📤 Subiendo: $archivo" -ForegroundColor Cyan
    
    if (Test-Path $archivo) {
        # Crear el directorio en el VPS si no existe
        $dir = Split-Path $archivo -Parent
        if ($dir) {
            ssh $VPS "mkdir -p $DESTINO/$dir" 2>$null
        }
        
        # Subir el archivo
        scp $archivo "${VPS}:${DESTINO}/${archivo}" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ OK" -ForegroundColor Green
            $exitosos++
        } else {
            Write-Host "   ❌ ERROR al subir" -ForegroundColor Red
            if ($requerido) {
                $errores++
            }
        }
    } else {
        Write-Host "   ⚠️  Archivo no encontrado localmente" -ForegroundColor Yellow
        if ($requerido) {
            $errores++
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "📊 RESUMEN" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "   ✅ Exitosos: $exitosos" -ForegroundColor Green
Write-Host "   ❌ Errores:  $errores" -ForegroundColor Red
Write-Host ""

if ($errores -gt 0) {
    Write-Host "❌ HUBO ERRORES AL SUBIR ARCHIVOS" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica:" -ForegroundColor Yellow
    Write-Host "1. Que estas en el directorio C:\app" -ForegroundColor Yellow
    Write-Host "2. Que puedes conectarte al VPS (ssh ${VPS})" -ForegroundColor Yellow
    Write-Host "3. Que los archivos existen localmente" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ TODOS LOS ARCHIVOS SUBIDOS CORRECTAMENTE" -ForegroundColor Green
Write-Host ""
Write-Host "📋 SIGUIENTE PASO:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta en el VPS (SSH):" -ForegroundColor White
Write-Host ""
Write-Host "   ssh ${VPS}" -ForegroundColor Yellow
Write-Host "   cd $DESTINO" -ForegroundColor Yellow
Write-Host "   chmod +x deploy-completo-fixed.sh" -ForegroundColor Yellow
Write-Host "   bash deploy-completo-fixed.sh" -ForegroundColor Yellow
Write-Host ""
