#!/bin/bash

echo "🔧 Desplegando corrección de reservas de usuarios..."

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo "📋 Paso 2: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web

echo "📋 Paso 3: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo "📋 Paso 4: Recargando nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado"
echo ""
echo "Para ver los logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
