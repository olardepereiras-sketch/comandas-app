#!/bin/bash

echo "🚀 Desplegando correcciones de plantillas de turnos..."

cd /var/www/reservamesa

echo "📦 Actualizando código..."
# Si tienes git configurado, puedes hacer pull aquí
# git pull

echo "🗄️  Ejecutando migración de base de datos..."
bun backend/db/fix-shift-templates-columns.ts

echo "🔄 Limpiando archivos compilados..."
rm -rf dist .expo

echo "📦 Construyendo frontend..."
bunx expo export -p web

echo "🔄 Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo "✅ Despliegue completado"
echo ""
echo "Para verificar el estado del backend:"
echo "  tail -f /var/www/reservamesa/backend.log"
