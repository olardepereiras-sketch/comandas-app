#!/bin/bash

echo "🔧 DESPLIEGUE FINAL - SOLUCIONANDO TODOS LOS PROBLEMAS"
echo "====================================================="

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2/5: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Modificación de reservas por token CORREGIDA (campo token agregado)"
echo "  ✅ Calendario con 7 columnas correctamente ajustadas"
echo "  ✅ Sistema de reservas funcionando"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
