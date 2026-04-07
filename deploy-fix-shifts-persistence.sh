#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE PERSISTENCIA DE TURNOS..."
echo "========================================================"

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

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Parsing correcto de shifts desde schedules (string JSON o array)"
echo "  ✅ Plantillas automáticamente seleccionadas cuando heredan de schedules"
echo "  ✅ Plantillas automáticamente desplegadas al abrir el modal"
echo "  ✅ Valores de configuración (maxGuests, minRating) heredados correctamente"
echo "  ✅ Persistencia de estado al volver a abrir el modal de turnos"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  ⚙️  https://quieromesa.com/restaurant/schedules"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
