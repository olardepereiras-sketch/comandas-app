#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DEFINITIVA DE CONFIG PRO"
echo "=================================================="
echo ""

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2/5: Limpiando caché del frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Cambios aplicados:"
echo "   ✅ Switches de config-pro ahora guardan correctamente"
echo "   ✅ Campos numéricos permiten cualquier valor"
echo "   ✅ Tiempo de modificación/cancelación se guarda"
echo "   ✅ Mensaje WhatsApp al restaurante sin emoticonos"
echo ""
echo "💡 Prueba ahora:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa/desactiva los switches"
echo "   3. Cambia los valores numéricos"
echo "   4. Presiona 'Guardar Cambios'"
echo "   5. Recarga la página y verifica que se mantienen"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
