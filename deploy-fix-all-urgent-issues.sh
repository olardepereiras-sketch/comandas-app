#!/bin/bash

echo "🔧 SOLUCIONANDO PROBLEMAS URGENTES..."
echo "======================================"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/7: Ejecutando diagnóstico de horas disponibles..."
bun backend/db/diagnose-available-hours-final.ts

echo ""
echo "📋 Paso 2/7: Corrigiendo day_exceptions sin shifts válidos..."
bun backend/db/fix-day-exceptions-shifts.ts

echo ""
echo "📋 Paso 3/7: Deteniendo servidor..."
pkill -f "bun backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 4/7: Limpiando caché..."
rm -rf node_modules/.cache
rm -rf dist
rm -rf .expo

echo ""
echo "📋 Paso 5/7: Reconstruyendo frontend..."
bun run export:web
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

echo ""
echo "📋 Paso 6/7: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 7/7: Recargando nginx..."
nginx -s reload

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Day exceptions corregidas (días abiertos tienen shifts válidos)"
echo "  ✅ Mesas disponibles: solo muestra mesas libres al editar reserva"
echo "  ✅ Notificación WhatsApp al anular reserva (ya implementado)"
echo "  ✅ Botón de abrir/cerrar día reducido 60% en ancho"
echo "  ✅ Botón 'Bloqueo de Mesas' reemplaza 'Ver Horarios Semanales'"
echo ""
echo "Problemas solucionados:"
echo "  1. ✅ Días abiertos en calendario ahora muestran horas en buscador"
echo "  2. ✅ Al editar reserva solo se muestran mesas disponibles"
echo "  3. ✅ WhatsApp enviado al anular reserva"
echo "  4. ✅ Botón de día más pequeño y a la izquierda"
echo ""
echo "Prueba los cambios en:"
echo "  🔍 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  ⚙️  https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
