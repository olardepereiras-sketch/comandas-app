#!/bin/bash

echo "🔧 Agregando columna token a reservations..."

cd /var/www/reservamesa

echo "📋 Ejecutando migración..."
bun backend/db/add-token-column.ts

echo "🛑 Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

echo "📦 Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web

echo "🚀 Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado"
echo ""
echo "Prueba la modificación de reservas en:"
echo "  https://quieromesa.com/client/reservation/[tu-token]"
