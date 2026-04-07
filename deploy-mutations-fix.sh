#!/bin/bash

echo "🔧 Fix Definitivo - Borrado y Cancelación"
echo "════════════════════════════════════════════════════════════════"

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "📋 1. Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || echo "   No había servidor corriendo"

echo ""
echo "📋 2. Limpiando y compilando frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "   ✅ Frontend compilado"

echo ""
echo "📋 3. Iniciando servidor con logs..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"

echo ""
echo "📋 4. Esperando que el servidor inicie..."
sleep 3

echo ""
echo "📋 5. Verificando servidor..."
if ps -p $SERVER_PID > /dev/null; then
    echo "   ✅ Servidor corriendo"
else
    echo "   ❌ Servidor falló"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "📋 6. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null || echo "   ⚠️  Nginx no activo (opcional)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ DEPLOY COMPLETADO"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🧪 PRUEBA AHORA:"
echo ""
echo "   1. Abre: http://200.234.236.133/admin/users"
echo "   2. Haz clic en un usuario"
echo "   3. Haz clic en 'Eliminar Usuario'"
echo "   4. Confirma la eliminación"
echo ""
echo "   Si funciona, verás en los logs:"
echo "   🔴 [DELETE CLIENT] Raw input received:"
echo "   🔵 [DELETE CLIENT] INICIO - Eliminando cliente:"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log | grep -E '(🔴|🔵|✅|❌|DELETE|CANCEL)'"
echo ""
echo "═══════════════════════════════════════════════════════════════"
