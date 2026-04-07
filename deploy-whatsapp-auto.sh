#!/bin/bash

echo "🚀 Desplegando funcionalidad de WhatsApp automático"
echo "================================================"

echo ""
echo "📋 PASO 1: Agregar columna a base de datos"
echo "================================================"
bun backend/db/add-auto-send-whatsapp.ts
if [ $? -ne 0 ]; then
  echo "❌ Error al agregar columna"
  exit 1
fi

echo ""
echo "📦 PASO 2: Reconstruir frontend"
echo "================================================"
rm -rf dist .expo
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir frontend"
  exit 1
fi

echo ""
echo "🔄 PASO 3: Reiniciar servidor backend"
echo "================================================"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "🌐 PASO 4: Recargar Nginx"
echo "================================================"
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📊 Cambios aplicados:"
echo "   ✅ Nueva columna 'auto_send_whatsapp' agregada a restaurants"
echo "   ✅ Switch en Configuración Pro para activar/desactivar WhatsApp automático"
echo "   ✅ Sistema solo enviará WhatsApp al cliente si está activado"
echo "   ✅ Botón de WhatsApp en email del restaurante siempre disponible"
echo ""
echo "🔍 Verificar logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
