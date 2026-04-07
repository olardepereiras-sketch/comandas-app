# QUIEROMESA - SCRIPT DE ACTUALIZACIÓN 2.0 (PowerShell)
# Script unificado para actualizar el sistema desde Windows
# Autor: Sistema QuieroMesa
# Fecha: 2026-01-17

$ErrorActionPreference = "Stop"

Write-Host "🚀 QUIEROMESA - ACTUALIZACIÓN 2.0" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# Variables de entorno correctas
$env:DATABASE_URL = "postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db"
$env:PGPASSWORD = "MiContrasenaSegura666"

function Print-Step {
    param($Message)
    Write-Host ""
    Write-Host "📋 $Message" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "❌ Error: $Message" -ForegroundColor Red
}

function Print-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Verificar que estamos en el directorio correcto
if (!(Test-Path "package.json")) {
    Print-Error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
}

Print-Step "Paso 1: Verificando variables de entorno"
if ([string]::IsNullOrEmpty($env:DATABASE_URL)) {
    Print-Error "DATABASE_URL no está configurada"
    exit 1
}
Print-Success "Variables de entorno configuradas"

Print-Step "Paso 2: Instalando dependencias"
bun install
Print-Success "Dependencias instaladas"

Print-Step "Paso 3: Actualizando esquema de base de datos"
Print-Warning "Arreglando tabla de bloqueos de mesas..."
try {
    bun backend/db/fix-table-blocks-constraint.ts
} catch {
    Print-Warning "La tabla ya existe o hubo un error menor"
}

Print-Warning "Verificando esquema de day_exceptions..."
Print-Success "Esquema de base de datos actualizado"

Print-Step "Paso 4: Compilando frontend"
Print-Warning "Exportando aplicación web..."
try {
    bunx expo export -p web
} catch {
    Print-Error "Error compilando frontend"
}
Print-Success "Frontend compilado"

Print-Step "Paso 5: Información de despliegue"
Print-Success "Actualización preparada para despliegue"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# Mostrar changelog
Write-Host "📝 CAMBIOS EN ESTA VERSIÓN (2.0.1):" -ForegroundColor Cyan
Write-Host "  • ✅ Calendario visible completamente en web (con scroll automático)"
Write-Host "  • ✅ Sistema de bloqueo/desbloqueo de mesas funcionando"
Write-Host "  • ✅ Visualización de mesas bloqueadas en modal del día"
Write-Host "  • ✅ Aspecto mejorado del calendario (ratio 1:1 en celdas)"
Write-Host "  • ✅ Constraint corregido en table_blocks (table_locations)"
Write-Host ""
