#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES COMPLETAS DE SISTEMA DE TURNOS..."
echo "=============================================================="

echo ""
echo "📋 Paso 1/7: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

echo ""
echo "📋 Paso 2/7: Limpiando datos antiguos de schedules y day_exceptions..."
bun backend/db/clean-schedules-data.ts

echo ""
echo "📋 Paso 3/7: Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📋 Paso 4/7: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 5/7: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "📋 Paso 6/7: Esperando que el servidor inicie..."
sleep 3

echo ""
echo "📋 Paso 7/7: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Datos antiguos limpiados (schedules y day_exceptions)"
echo "  ✅ Botón Eliminar ahora funciona correctamente (usa .mutate())"
echo "  ✅ Detección correcta de días abiertos en buscador"
echo "  ✅ Herencia correcta de turnos desde schedules a calendar"
echo ""
echo "⚠️  IMPORTANTE: Debes configurar tus horarios desde cero"
echo ""
echo "Instrucciones:"
echo "  1. Ve a https://quieromesa.com/restaurant/schedules"
echo "  2. Crea tus plantillas de turnos (Comidas, Cenas, etc.)"
echo "  3. Aplica las plantillas a los días de la semana que desees"
echo "  4. Ve a https://quieromesa.com/restaurant/reservations-pro"
echo "  5. Los días configurados aparecerán automáticamente como abiertos"
echo "  6. Al pulsar 'Turnos para Hoy', las plantillas aparecerán desplegadas"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
