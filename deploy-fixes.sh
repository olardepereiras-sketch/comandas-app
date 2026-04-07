#!/bin/bash

echo "🔧 Desplegando correcciones de fechas y WhatsApp automático"
echo "================================================"

echo ""
echo "📦 1. Reconstruyendo el frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir frontend"
  exit 1
fi

echo ""
echo "🔄 2. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🌐 3. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "================================================"
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📋 Cambios aplicados:"
echo "  - Corrección de diferencia de 1 día en fechas"
echo "  - Corrección de persistencia de autoSendWhatsapp"
echo ""
echo "🔍 Verificar logs del servidor:"
echo "  tail -f backend.log"
