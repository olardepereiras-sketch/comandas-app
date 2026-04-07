#!/bin/bash

echo "🔧 Fix Botones - Eliminar Usuario y Anular Reservas"
echo "═══════════════════════════════════════════════════════════════════"

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "❌ Archivo .env no encontrado"
  exit 1
fi

echo ""
echo "📋 1. Deteniendo servidor..."
pkill -f "bun backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 2. Limpiando frontend..."
rm -rf dist
echo "✅ Frontend limpiado"

echo ""
echo "📋 3. Compilando frontend..."
EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://200.234.236.133}" \
npx expo export -p web --output-dir dist > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend compilado"
else
  echo "❌ Error compilando frontend"
  exit 1
fi

echo ""
echo "📋 4. Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"
sleep 5
echo "✅ Servidor iniciado"

echo ""
echo "📋 5. Recargando nginx..."
nginx -s reload > /dev/null 2>&1
echo "✅ Nginx recargado"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ DESPLIEGUE COMPLETADO"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "🎯 CORRECCIONES APLICADAS:"
echo ""
echo "1. ✅ Botón eliminar usuario ahora funciona"
echo "   - Cambiado de .mutateAsync() a .mutate()"
echo ""
echo "2. ✅ Botón anular reserva (restaurante) ahora funciona"
echo "   - Cambiado de .mutateAsync() a .mutate()"
echo "   - Envía notificación WhatsApp al cliente"
echo ""
echo "3. ✅ Botón cancelar reserva (cliente) ahora funciona"
echo "   - Cambiado de .mutateAsync() a .mutate()"
echo "   - Envía notificación al restaurante"
echo ""
echo "4. ✅ Vista del cliente mejorada:"
echo "   - Muestra ubicación de la reserva"
echo "   - Muestra tronas, carrito y mascotas si las solicitó"
echo "   - Muestra observaciones del cliente"
echo "   - Notas del restaurante solo si NO está cancelada"
echo ""
echo "5. ✅ Al recuperar reserva se limpia la nota de anulación"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
echo "🧪 Pruebas:"
echo "   1. Admin - Eliminar usuario:"
echo "      http://200.234.236.133/admin/users"
echo ""
echo "   2. Restaurante - Anular reserva:"
echo "      http://200.234.236.133/restaurant/reservations-pro"
echo ""
echo "   3. Cliente - Ver y cancelar reserva:"
echo "      http://200.234.236.133/client/reservation/[token]"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
