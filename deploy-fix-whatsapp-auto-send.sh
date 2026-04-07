#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE ENVÍO AUTOMÁTICO WHATSAPP"
echo "======================================================"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2/4: Limpiando caché del frontend..."
rm -rf dist/
rm -rf .expo/

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
bun run export

if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir el frontend"
  exit 1
fi

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Recargando Nginx..."
nginx -s reload

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Ahora podrás:"
echo "   1. Activar 'Usar WhatsApp Web'"
echo "   2. Escanear el código QR"
echo "   3. Activar 'Envío Automático de WhatsApp' (el switch se quedará activado)"
echo "   4. Crear una reserva de prueba"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
