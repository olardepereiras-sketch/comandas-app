#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES DEFINITIVAS"
echo "======================================="
echo ""
echo "Cambios incluidos:"
echo "  ✅ Refrescado de datos en config-pro"
echo "  ✅ Corrección de notificación al restaurante (sin emoticonos)"
echo "  ✅ Corrección de recordatorios (switches y campos numéricos)"
echo "  ✅ Botones de Contactar y Llamar en reservas-pro"
echo ""

echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2/4: Limpiando caché del frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error al reconstruir el frontend"
    exit 1
fi

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Verifica los cambios:"
echo "   1. Config Pro: https://quieromesa.com/restaurant/config-pro"
echo "   2. Reservas Pro: https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "📊 Cambios implementados:"
echo "   • Los switches y campos ahora se guardan correctamente"
echo "   • Los datos se refrescan automáticamente después de guardar"
echo "   • Las notificaciones al restaurante muestran la mesa asignada"
echo "   • Nuevos botones de Contactar y Llamar en reservas"
echo ""
echo "💡 Si necesitas ver los logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
