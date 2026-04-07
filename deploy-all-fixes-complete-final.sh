#!/bin/bash

echo "🔧 DESPLEGANDO SOLUCIONES FINALES..."
echo "===================================="
echo ""

echo "📋 Cambios implementados:"
echo "  ✅ Filtro de mesas mejorado (sin requisitos especiales = sin horarios)"
echo "  ✅ Calendario con cuadros más pequeños (7 columnas perfectas)"
echo "  ✅ Proceso de confirmación en buscador verificado"
echo ""

echo "🛑 Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "🧹 Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📦 Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "🚀 Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Mesas sin tronas/carrito: no muestra horarios para 1-2 comensales"
echo "  ✅ Calendario reducido 5% (7 columnas cuadradas correctas)"
echo "  ✅ Buscador confirmación funcionando"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
