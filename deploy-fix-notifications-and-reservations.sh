#!/bin/bash

echo "🚀 Desplegando correcciones de notificaciones y reservations-pro..."

echo ""
echo "📦 Paso 1: Limpiando archivos antiguos..."
rm -rf dist .expo

echo ""
echo "📦 Paso 2: Construyendo aplicación..."
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al construir la aplicación"
  exit 1
fi

echo ""
echo "📦 Paso 3: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend reiniciado"

echo ""
echo "📦 Paso 4: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📋 Verificaciones recomendadas:"
echo "1. Ver logs del backend: tail -f /var/www/reservamesa/backend.log"
echo "2. Consultar notificaciones: cd /var/www/reservamesa && bun backend/scripts/check-reminder-notifications.ts"
echo "3. Verificar worker está corriendo: tail -f /var/www/reservamesa/backend.log | grep 'Notification Worker'"
