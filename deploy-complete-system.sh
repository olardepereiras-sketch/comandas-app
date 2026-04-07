#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA COMPLETO DE TURNOS Y CORRECCIONES..."
echo "============================================================"

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pm2 stop all || echo "No hay procesos PM2 activos"

echo ""
echo "📋 Paso 2/5: Limpiando caché..."
rm -rf dist/
rm -rf .expo/

echo ""
echo "📋 Paso 3/5: Reconstruyendo frontend..."
npx expo export -p web --output-dir dist

echo ""
echo "📋 Paso 4/5: Reiniciando servidor..."
pm2 restart all || bun run backend/server.ts &

echo ""
echo "📋 Paso 5/5: Recargando nginx..."
sudo nginx -s reload

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Error 500 en creación de reservas CORREGIDO"
echo "  ✅ Calendario reducido a 7 columnas cuadradas"
echo "  ✅ Sistema de turnos por día implementado"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
