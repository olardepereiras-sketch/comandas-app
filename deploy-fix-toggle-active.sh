#!/bin/bash

echo "🚀 Desplegando corrección del botón Activar/Desactivar..."
echo ""

cd /var/www/reservamesa

echo "📦 Limpiando builds anteriores..."
rm -rf dist .expo

echo "📦 Construyendo frontend..."
bunx expo export -p web

echo "🔄 Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Cambios aplicados:"
echo "   ✅ Botón Activar/Desactivar ahora funciona correctamente"
echo "   ✅ El estado se actualiza en tiempo real"
echo "   ✅ Agregados logs de diagnóstico"
echo ""
echo "🔍 Para verificar:"
echo "   1. Ve a https://quieromesa.com/restaurant"
echo "   2. Pulsa el botón Activar/Desactivar"
echo "   3. El estado debe cambiar inmediatamente"
echo ""
echo "📊 Ver logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
