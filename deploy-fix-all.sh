#!/bin/bash

echo "🚀 Desplegando correcciones..."

cd /var/www/reservamesa

echo "📦 Recompilando frontend..."
rm -rf dist .expo
bunx expo export -p web

echo "🔄 Reiniciando backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "🌐 Recargando nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado"
