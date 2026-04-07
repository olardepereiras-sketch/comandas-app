#!/bin/bash

echo "🚀 DEPLOY SIMPLE - RESERVAMESA"
echo "=============================="
echo ""

# Detener todo
echo "📋 Deteniendo servicios..."
pkill -f bun
sleep 2

# Limpiar
echo "📋 Limpiando..."
rm -rf node_modules dist .expo

# Instalar
echo "📋 Instalando dependencias..."
bun install

# Verificar que las rutas existen
echo ""
echo "📋 Verificando archivos de rutas..."
if [ ! -f "app/_layout.tsx" ]; then
    echo "❌ ERROR: No se encuentra app/_layout.tsx"
    exit 1
fi
if [ ! -f "app/index.tsx" ]; then
    echo "❌ ERROR: No se encuentra app/index.tsx"
    exit 1
fi
echo "✅ Archivos de rutas OK"

# Exportar con todas las opciones
echo ""
echo "📋 Exportando frontend..."
export NODE_ENV=production
export EXPO_USE_STATIC=true

# Intentar con expo export primero
npx expo export -p web --output-dir dist --clear

# Verificar que se generó metadata.json
if [ ! -f "dist/metadata.json" ]; then
    echo "⚠️  No se generó metadata.json, intentando export:web..."
    npx expo export:web --output-dir dist --clear
fi

# Verificar archivos generados
echo ""
echo "📋 Archivos generados:"
ls -lh dist/ | head -10

# Verificar metadata
if [ -f "dist/metadata.json" ]; then
    echo ""
    echo "📋 Metadata generado:"
    cat dist/metadata.json | head -20
else
    echo "⚠️  ADVERTENCIA: No se generó metadata.json"
fi

# Iniciar backend
echo ""
echo "📋 Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

# Verificar backend
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend corriendo (PID: $BACKEND_PID)"
    
    # Health check
    HEALTH=$(curl -s http://127.0.0.1:3000/api/health)
    if [[ $HEALTH == *"ok"* ]]; then
        echo "✅ Health check OK"
    else
        echo "⚠️  Health check falló"
    fi
else
    echo "❌ ERROR: Backend no arrancó"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL: http://200.234.236.133"
echo "📊 Logs: tail -f backend.log"
echo ""
