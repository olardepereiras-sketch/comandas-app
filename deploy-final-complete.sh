#!/bin/bash

echo "🚀 Despliegue Final - Eliminar Usuarios y Anular Reservas"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /var/www/reservamesa

echo "📋 1. Cargando variables de entorno..."
export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"
echo ""

echo "📋 2. Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"
echo ""

echo "📋 3. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend compilado"
else
  echo "❌ Error compilando frontend"
  exit 1
fi
echo ""

echo "📋 4. Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 5

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado (PID: $SERVER_PID)"
else
  echo "❌ Error: Servidor no inició"
  tail -20 backend.log
  exit 1
fi
echo ""

echo "📋 5. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null && echo "✅ Nginx recargado" || echo "⚠️  Nginx no activo"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ DESPLIEGUE COMPLETADO"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🎯 PRUEBA 1: Operaciones manuales desde el VPS (Backend)"
echo ""
echo "   Listar clientes y reservas:"
echo "   chmod +x test-operations.sh && ./test-operations.sh"
echo ""
echo "   Eliminar un cliente:"
echo "   bun backend/test-manual-operations.ts delete-client <clientId>"
echo ""
echo "   Anular una reserva:"
echo "   bun backend/test-manual-operations.ts cancel-reservation <reservationId>"
echo ""
echo "🎯 PRUEBA 2: Operaciones desde el frontend (UI)"
echo ""
echo "   Admin - Eliminar usuarios:"
echo "   http://200.234.236.133/admin/users"
echo ""
echo "   Restaurante - Anular reservas:"
echo "   http://200.234.236.133/restaurant/reservations-pro"
echo ""
echo "   Monitorear logs:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
echo "════════════════════════════════════════════════════════════════"
