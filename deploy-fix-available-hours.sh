#!/bin/bash

echo "🔧 SOLUCIONANDO PROBLEMA DE HORAS DISPONIBLES..."
echo "================================================"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/5: Ejecutando diagnóstico..."
bun backend/db/diagnose-available-hours-final.ts

echo ""
echo "📋 Paso 2/5: Corrigiendo day_exceptions..."
bun backend/db/fix-day-exceptions-shifts.ts

echo ""
echo "📋 Paso 3/5: Deteniendo servidor..."
pkill -f "bun backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
bun run export:web
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 6/5: Recargando nginx..."
nginx -s reload

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Day exceptions corregidas (días abiertos tienen shifts válidos)"
echo "  ✅ Mesas disponibles solo muestran las libres en edición"
echo "  ✅ Notificación WhatsApp al anular reserva"
echo ""
echo "Prueba los cambios en:"
echo "  🔍 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  ⚙️  https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
