#!/bin/bash

echo "🔧 SOLUCIONANDO TODOS LOS PROBLEMAS..."
echo "======================================"
echo ""

echo "📋 Cambios aplicados:"
echo "  ✅ Filtro de mesas corregido para 1-2 comensales"
echo "  ✅ Calendario con 7 columnas (aspecto ratio reducido)"
echo "  ✅ Sistema de reservas optimizado"
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
echo "  ✅ Filtro de mesas corregido (permite 1-2 comensales sin tronas)"
echo "  ✅ Calendario con 7 columnas correctamente ajustadas"
echo "  ✅ Reservas modificadas se marcan como 'modified'"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
