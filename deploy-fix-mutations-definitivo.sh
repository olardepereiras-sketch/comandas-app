#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Mutaciones DELETE y CANCEL"
echo "════════════════════════════════════════════════════════════════"

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "❌ Archivo .env no encontrado"
  exit 1
fi

echo ""
echo "📋 1. Deteniendo servidor anterior..."
pkill -f "bun.*backend/server.ts" && echo "✅ Servidor detenido" || echo "⚠️  No había servidor corriendo"

echo ""
echo "📋 2. Limpiando cache del frontend..."
rm -rf dist .expo node_modules/.cache
echo "✅ Cache limpiado"

echo ""
echo "📋 3. Compilando frontend con cliente tRPC arreglado..."
bunx expo export -p web > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend compilado correctamente"
else
  echo "❌ Error compilando frontend"
  exit 1
fi

echo ""
echo "📋 4. Iniciando servidor con logs detallados..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   PID del servidor: $SERVER_PID"

sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ Error iniciando servidor"
  echo "   Últimas líneas del log:"
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
echo "🔍 Monitorear logs en tiempo real:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌|📨)'"
echo ""
echo "🧪 AHORA intenta desde la web:"
echo "   1. Eliminar un usuario: http://200.234.236.133/admin/users"
echo "   2. Anular una reserva: http://200.234.236.133/restaurant/reservations-pro"
echo ""
echo "   Deberías ver en los logs:"
echo "   📨 tRPC Request: POST /api/trpc/clients.delete"
echo "   🔴 [DELETE CLIENT] Raw input received: ..."
echo ""
echo "   Si solo ves GET, el problema persiste en el cliente"
echo "   Si ves POST, el problema está solucionado ✅"
echo ""
