#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA COMPLETO DE RESERVAS..."
echo "=================================================="
echo ""

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
echo ""

echo "📋 Paso 2/5: Limpiando caché..."
cd /var/www/reservamesa
rm -rf dist .expo
echo ""

echo "📋 Paso 3/5: Reconstruyendo frontend..."
bunx expo export -p web
echo ""

echo "📋 Paso 4/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 2
echo ""

echo "📋 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx
echo ""

echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados en Reservas Pro:"
echo "  ✅ Botón Editar - cambiar mesa/ubicación de reserva"
echo "  ✅ Botón Anular - cancelar reserva con confirmación"
echo "  ✅ Botón Valorar - valorar cliente (24h desde reserva)"
echo "  ✅ Sistema de criterios de valoración (puntualidad, conducta, etc.)"
echo "  ✅ Marcador de No Show"
echo "  ✅ Información completa: Nº reserva, mesa, tronas, carrito, mascota"
echo "  ✅ Tarjetas pendientes (amarillo) cuando no hay mesa asignada"
echo ""
echo "Cambios aplicados en Reservas:"
echo "  ✅ Misma información completa sin botones de edición"
echo "  ✅ Solo visualización de reservas"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  📋 https://quieromesa.com/restaurant/reservations"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
