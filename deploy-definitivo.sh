#!/bin/bash

set -e

echo "🚀 DEPLOY DEFINITIVO - RESERVAMESA"
echo "===================================="
echo ""

# 1. Detener servicios
echo "📋 PASO 1: Deteniendo servicios..."
pkill -f bun || true
sleep 2

# 2. Limpiar completamente
echo "📋 PASO 2: Limpieza completa..."
rm -rf node_modules dist .expo

# 3. Instalar dependencias
echo "📋 PASO 3: Instalando dependencias..."
bun install

# 4. Verificar archivos
echo "📋 PASO 4: Verificando archivos..."
if [ ! -f "app/_layout.tsx" ] || [ ! -f "app/index.tsx" ]; then
    echo "❌ ERROR: Faltan archivos de rutas"
    exit 1
fi
echo "✅ Archivos OK"

# 5. Exportar frontend usando bunx
echo ""
echo "📋 PASO 5: Exportando frontend con bunx..."
echo "   (Esto puede tardar 2-3 minutos)"

# Exportar usando bunx
bunx expo export -p web --output-dir dist --clear

# Verificar que se generó
if [ ! -f "dist/index.html" ]; then
    echo "❌ ERROR: No se generó dist/index.html"
    exit 1
fi

echo "✅ Frontend exportado"

# 6. Iniciar backend
echo ""
echo "📋 PASO 6: Iniciando backend..."
cd /var/www/reservamesa
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
sleep 3

# 7. Verificar
echo ""
echo "📋 PASO 7: Verificando..."

if ! pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "❌ ERROR: Backend no corriendo"
    tail -20 backend.log
    exit 1
fi

HEALTH=$(curl -s http://127.0.0.1:3000/api/health || echo "error")
if [[ $HEALTH == *"ok"* ]]; then
    echo "✅ Backend OK"
else
    echo "❌ Health check falló: $HEALTH"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL: http://200.234.236.133"
echo "📊 Logs: tail -f backend.log"
echo ""
