#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES COMPLETAS DE SISTEMA DE TURNOS..."
echo "=============================================================="

echo ""
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
echo "  ✅ Botón 'Actualizar Calendario' en módulo Horarios"
echo "  ✅ Schedules ahora guarda templateId correcto (no IDs generados)"
echo "  ✅ Herencia correcta de turnos desde schedules a calendario"
echo "  ✅ Plantillas se seleccionan y despliegan automáticamente"
echo "  ✅ Botón 'Cerrar día / Abrir día' reposicionado correctamente"
echo "  ✅ Días reabiertos aparecen en buscador correctamente"
echo "  ✅ Días nuevos con turnos tienen horas disponibles en buscador"
echo ""
echo "Instrucciones:"
echo "  1. Ve a https://quieromesa.com/restaurant/schedules"
echo "  2. Configura tus plantillas de turnos en los días de la semana"
echo "  3. Pulsa 'Actualizar Calendario' para refrescar la configuración"
echo "  4. Ve a https://quieromesa.com/restaurant/reservations-pro"
echo "  5. Abre un día y pulsa 'Turnos para Hoy'"
echo "  6. Las plantillas configuradas aparecerán automáticamente seleccionadas y desplegadas"
echo "  7. Los días abiertos estarán disponibles en https://quieromesa.com/client"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
