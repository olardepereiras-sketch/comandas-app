#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES CRÍTICAS DE SHIFTS Y PLANTILLAS..."
echo "================================================================"
echo ""

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || echo "No hay procesos activos"
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
echo "  ✅ Nombres de plantillas correctos en schedules"
echo "  ✅ Botón eliminar funcionando correctamente (.mutate en lugar de .mutateAsync)"
echo "  ✅ Plantillas heredadas de schedules se muestran desplegadas automáticamente"
echo "  ✅ Plantillas de exceptions se muestran desplegadas automáticamente"
echo "  ✅ Días reabiertos ahora tienen horas disponibles en el buscador"
echo ""
echo "Prueba los cambios en:"
echo "  ⚙️  https://quieromesa.com/restaurant/schedules"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  🔍 https://quieromesa.com/client"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
