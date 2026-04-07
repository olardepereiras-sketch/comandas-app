#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE CARGA DE TURNOS..."
echo "================================================"

# Ir al directorio del proyecto
cd /var/www/reservamesa

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
echo "  ✅ Endpoint list de day_exceptions devuelve shifts completos"
echo "  ✅ Frontend detecta correctamente shifts de exceptions"
echo "  ✅ Frontend hereda correctamente shifts de schedules"
echo "  ✅ Plantillas se seleccionan y expanden automáticamente"
echo "  ✅ Botón 'Cerrar día / Abrir día' reposicionado y ajustado"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  ⚙️  https://quieromesa.com/restaurant/schedules"
echo ""
echo "Para ejecutar diagnóstico:"
echo "  chmod +x diagnose-shifts.sh && ./diagnose-shifts.sh"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
