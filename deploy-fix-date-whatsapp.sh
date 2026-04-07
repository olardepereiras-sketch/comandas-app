#!/bin/bash

echo "🔧 Desplegando correcciones de fecha y WhatsApp automático"
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
echo "🔄 2. Reiniciando el servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "🌐 3. Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "================================================"
echo "✅ Despliegue completado"
echo ""
echo "📋 Cambios aplicados:"
echo "  1. ✅ Corregido problema de fecha (día -1)"
echo "  2. ✅ Corregido guardado de autoSendWhatsapp"
echo ""
echo "🔍 Verifica:"
echo "  - Abre un día en reservas-pro"
echo "  - Verifica que aparece el mismo día en /client"
echo "  - Activa autoSendWhatsapp en config-pro"
echo "  - Recarga y verifica que sigue activado"
