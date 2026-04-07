#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA DE WHATSAPP WEB POR RESTAURANTE"
echo "======================================================"

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/5: Limpiando caché..."
cd /var/www/reservamesa
rm -rf dist .expo

echo ""
echo "📋 Paso 3/5: Agregando campo use_whatsapp_web a la base de datos..."
bun backend/db/add-whatsapp-web-field.ts

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
if bunx expo export -p web; then
  echo "✅ Frontend reconstruido exitosamente"
else
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Sistema de WhatsApp Web configurado:"
echo "   - Cada restaurante puede conectar su propio WhatsApp"
echo "   - Ve a https://quieromesa.com/restaurant/config-pro"
echo "   - Activa 'Usar WhatsApp Web' y escanea el código QR"
echo ""
echo "💡 Monitoreando logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
