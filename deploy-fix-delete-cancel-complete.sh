#!/bin/bash

echo "🔧 Solución Definitiva - Eliminar Usuarios y Anular Reservas"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /var/www/reservamesa

echo "📋 1. Cargando variables de entorno..."
export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"
echo ""

echo "📋 2. Deteniendo procesos..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Procesos detenidos"
echo ""

echo "📋 3. Limpiando y compilando frontend..."
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
echo "   PID: $SERVER_PID"
sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado"
else
  echo "❌ Error iniciando servidor"
  echo "Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi
echo ""

echo "📋 5. Verificando health check..."
HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
  echo "✅ Health check OK"
else
  echo "⚠️  Health check falló (pero el servidor puede estar corriendo)"
fi
echo ""

echo "📋 6. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null || echo "⚠️  Nginx no activo"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Sistema reiniciado"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔍 PASO 1: Probar operaciones manualmente desde el VPS"
echo ""
echo "   Primero, lista los clientes y reservas:"
echo "   chmod +x test-operations.sh"
echo "   ./test-operations.sh"
echo ""
echo "   Luego, para eliminar un cliente:"
echo "   bun backend/test-manual-operations.ts delete-client <clientId>"
echo ""
echo "   Para anular una reserva:"
echo "   bun backend/test-manual-operations.ts cancel-reservation <reservationId>"
echo ""
echo "🔍 PASO 2: Si las operaciones manuales funcionan, probar desde el frontend"
echo ""
echo "   Abre en el navegador:"
echo "   http://200.234.236.133/admin/users"
echo ""
echo "   Monitorea los logs:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
echo "   Si ves los logs de DELETE/CANCEL, significa que funciona"
echo "   Si NO los ves, el problema está en el frontend"
echo ""
echo "════════════════════════════════════════════════════════════════"
