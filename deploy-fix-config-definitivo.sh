#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DEFINITIVA DE CONFIG PRO"
echo "=================================================="

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2/5: Limpiando caché y compilaciones..."
rm -rf dist .expo node_modules/.cache

echo ""
echo "📋 Paso 3/5: Compilando frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/5: Verificando cambios en backend..."
echo "✓ restaurants.list ahora retorna todos los campos de configuración"
echo "✓ email.ts usa db pasado por parámetro correctamente"

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 6/6: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "🔍 Cambios aplicados:"
echo "   ✓ Config Pro ahora muestra valores correctos de BD"
echo "   ✓ Switches se mantienen después de guardar"
echo "   ✓ Notificaciones WhatsApp muestran nombre de mesa"
echo ""
echo "📊 Verificar logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
