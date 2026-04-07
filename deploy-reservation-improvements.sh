#!/bin/bash

echo "🔧 DESPLEGANDO MEJORAS DE RESERVAS PRO..."
echo "========================================"

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

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
echo "  ✅ Endpoint de editar reserva actualizado (cambiar mesa/ubicación)"
echo "  ✅ Nuevo endpoint de valoración con criterios dinámicos"
echo "  ✅ Sistema de no-show activable después de 24h"
echo "  ✅ Visualización completa de información de reservas"
echo "  ✅ Botones de gestión en Reservas Pro"
echo "  ✅ Vista de solo lectura en módulo Reservas"
echo ""
echo "📝 NOTA IMPORTANTE:"
echo "Los botones de EDITAR, ANULAR y VALORAR solo aparecen en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo ""
echo "El módulo de solo visualización está en:"
echo "  📊 https://quieromesa.com/restaurant/reservations"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
