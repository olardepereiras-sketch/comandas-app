#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES COMPLETAS..."
echo "=========================================="
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

echo ""
echo "📋 Paso 2/5: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Listado de clientes corregido (ahora muestra todos los usuarios)"
echo "  ✅ Dashboard stats corregido (error SQL solucionado)"
echo "  ✅ Botón abrir/cerrar día reducido 60% y a la izquierda"
echo "  ✅ Eliminación de plantillas en schedules funcionando"
echo "  ✅ Script de diagnóstico de horas disponibles creado"
echo ""
echo "Prueba los cambios en:"
echo "  👥 https://quieromesa.com/admin/users"
echo "  📊 https://quieromesa.com/restaurant"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  ⚙️  https://quieromesa.com/restaurant/schedules"
echo ""
echo "Para ejecutar diagnóstico de horas disponibles:"
echo "  chmod +x diagnose-available-hours-complete.sh"
echo "  ./diagnose-available-hours-complete.sh"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
