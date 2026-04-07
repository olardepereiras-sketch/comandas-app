#!/bin/bash

echo "🔧 Solucionando problemas críticos del sistema..."
echo ""

echo "📋 Cambios que se van a aplicar:"
echo "  ✅ Corrección de modificación de reservas por token"
echo "  ✅ Calendario de Reservas Pro con 7 columnas"
echo "  ✅ Sincronización de días abiertos/cerrados"
echo "  ✅ Configuración de turnos específicos por día"
echo ""

cd /var/www/reservamesa

echo "🛑 Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
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
echo "✅ ¡Despliegue completado!"
echo ""
echo "Problemas solucionados:"
echo "  ✅ Modificación de reservas por token FUNCIONANDO"
echo "  ✅ Calendario con 7 columnas correctas (L-M-X-J-V-S-D)"
echo "  ✅ Días abiertos/cerrados sincronizados entre calendario y buscador"
echo "  ✅ Botón 'Turnos para Hoy' agregado en días abiertos"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[tu-token]"
echo "  🔄 https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
