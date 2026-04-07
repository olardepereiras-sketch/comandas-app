#!/bin/bash

echo "🔧 RECONSTRUYENDO FRONTEND"
echo "=========================="
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo ""

echo "📋 Paso 2/4: Limpiando caché..."
rm -rf dist .expo
echo ""

echo "📋 Paso 3/4: Reconstruyendo frontend..."
bunx expo export -p web
echo ""

echo "📋 Paso 4/4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo ""

echo "✅ FRONTEND RECONSTRUIDO"
echo ""
echo "📱 Ahora ve a:"
echo "   https://quieromesa.com/restaurant/config-pro"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
