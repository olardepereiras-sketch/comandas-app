#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES DE CALENDARIO Y RESERVAS..."
echo "=========================================================="

echo ""
echo "📋 Cambios incluidos:"
echo "  ✅ Calendario de Reservas Pro con 7 columnas"
echo "  ✅ Prevención de modificación de reservas canceladas/modificadas"
echo "  ✅ Mejora de diferenciación visual de reservas"
echo ""

echo "📋 Paso 1/3: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true
pkill -f "bun run backend/server.ts" 2>/dev/null || true
sleep 2

echo ""
echo "📋 Paso 2/3: Limpiando caché..."
rm -rf dist/ .expo/ node_modules/.cache/ 2>/dev/null || true

echo ""
echo "📋 Paso 3/3: Reconstruyendo frontend..."
npx expo export -p web --output-dir dist --clear

echo ""
echo "🔄 Reiniciando servidor..."
cd /var/www/reservamesa
pm2 restart backend || pm2 start ecosystem.config.js
sleep 2

echo ""
echo "🔄 Recargando nginx..."
nginx -t && nginx -s reload

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Calendario Pro ahora muestra 7 columnas correctamente"
echo "  ✅ Reservas canceladas/modificadas no permiten modificación"
echo "  ✅ Reservas activas realzadas con bordes verdes"
echo "  ✅ Reservas canceladas/modificadas atenuadas visualmente"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
