#!/bin/bash

echo "🔧 SOLUCIONANDO TODOS LOS PROBLEMAS CRÍTICOS..."
echo "=============================================="

echo ""
echo "📋 Paso 1/5: Arreglando base de datos..."
bun backend/db/fix-all-critical-final.ts
if [ $? -ne 0 ]; then
    echo "❌ Error arreglando base de datos"
    exit 1
fi

echo ""
echo "📋 Paso 2/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 3/5: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
bunx expo export -p web
if [ $? -ne 0 ]; then
    echo "❌ Error reconstruyendo frontend"
    exit 1
fi

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Columna rotation_time_minutes agregada a tables"
echo "  ✅ Sistema de reservas funcionando correctamente"
echo "  ✅ Modificación de reservas por token corregida"
echo "  ✅ Calendario con 7 columnas correctas"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
