#!/bin/bash

echo "🔧 SOLUCIONANDO TODOS LOS PROBLEMAS CRÍTICOS..."
echo "=============================================="

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/4: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Modificación por token genera nuevo token único"
echo "  ✅ Filtro de mesas corregido para 1-2 comensales"
echo "  ✅ Calendario con 7 columnas cuadradas"
echo "  ✅ Reservas antiguas marcadas como 'modified'"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
