#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA COMPLETO DE TURNOS Y MEJORAS VISUALES..."
echo "=============================================================="

echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pm2 stop reservamesa-backend 2>/dev/null || echo "No hay procesos PM2 activos"

echo ""
echo "📋 Paso 2/4: Limpiando caché..."
rm -rf dist/
rm -rf .expo/

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
npx expo export -p web --output-dir dist

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
pm2 restart reservamesa-backend || bun run backend/server.ts &

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Plantillas de turnos se expanden automáticamente cuando están seleccionadas"
echo "  ✅ Herencia correcta de configuración desde horarios semanales"
echo "  ✅ Badges de estado profesionales (Confirmada/Anulada/Pendiente)"
echo "  ✅ Fondo verde translúcido en reservas activas"
echo "  ✅ Mejor diferenciación visual entre reservas activas y anuladas"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
