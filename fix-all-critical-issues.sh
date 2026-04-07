#!/bin/bash

echo "🔧 SOLUCIONANDO TODOS LOS PROBLEMAS CRÍTICOS..."
echo "=============================================="

cd /var/www/reservamesa || exit 1

echo ""
echo "📋 Paso 1/5: Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" || true

echo ""
echo "📋 Paso 2/5: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 2

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Modificación de reservas por token CORREGIDA (confirmation_token)"
echo "  ✅ Creación de reservas CORREGIDA (client_name, client_phone)"
echo "  ✅ Horarios disponibles mejorados (considera rotation_time)"
echo "  ✅ Algoritmo de disponibilidad mejorado"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
