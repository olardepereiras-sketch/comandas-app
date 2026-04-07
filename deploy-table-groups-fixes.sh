#!/bin/bash

set -e

echo "🚀 Desplegando correcciones de grupos de mesas..."

echo ""
echo "📦 Paso 1: Ejecutando migración de base de datos..."
bun run backend/db/fix-table-groups-location.ts

echo ""
echo "📦 Paso 2: Limpiando archivos antiguos..."
rm -rf dist .expo

echo ""
echo "📦 Paso 3: Construyendo aplicación..."
bunx expo export -p web

echo ""
echo "📦 Paso 4: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "📦 Paso 5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo "📝 Verificar logs: tail -f /var/www/reservamesa/backend.log"
