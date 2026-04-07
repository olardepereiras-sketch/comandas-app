#!/bin/bash

echo "🔧 SOLUCIONANDO CONFLICTO DE WHATSAPP WEB"
echo "=========================================="
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo "📋 Paso 2/5: Eliminando sesión antigua de WhatsApp Web (causa del conflicto)..."
if [ -d "whatsapp-session" ]; then
  rm -rf whatsapp-session
  echo "✅ Sesión antigua eliminada"
else
  echo "ℹ️  No hay sesión antigua que eliminar"
fi

echo "📋 Paso 3/5: Limpiando caché..."
rm -rf dist .expo

echo "📋 Paso 4/5: Reconstruyendo frontend..."
bunx expo export -p web
if [ $? -eq 0 ]; then
  echo "✅ Frontend reconstruido exitosamente"
else
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi

echo "📋 Paso 5/5: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Sistema corregido:"
echo "   - Eliminado sistema antiguo de WhatsApp Web (global)"
echo "   - Ahora usa SOLO WhatsApp Manager (por restaurante)"
echo "   - Cada restaurante usa su propia sesión en whatsapp-sessions/{restaurantId}"
echo ""
echo "🔧 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa 'Usar WhatsApp Web'"
echo "   3. Escanea el código QR con el WhatsApp del restaurante"
echo "   4. Activa 'Envío Automático de WhatsApp'"
echo "   5. Crea una reserva de prueba"
echo ""
echo "💡 Monitoreando logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
