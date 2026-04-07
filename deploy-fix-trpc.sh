#!/bin/bash

echo "🔧 Desplegando corrección de tRPC"
echo "════════════════════════════════════════════════════════════════"

# 1. Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# 2. Detener servidor
echo ""
echo "📋 1. Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Servidor detenido"

# 3. Limpiar y compilar frontend
echo ""
echo "📋 2. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend compilado"

# 4. Iniciar servidor
echo ""
echo "📋 3. Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3
echo "✅ Servidor iniciado (PID: $SERVER_PID)"

# 5. Verificar health check
echo ""
echo "📋 4. Verificando servidor..."
sleep 2
HEALTH=$(curl -s http://localhost:3000/api/health | grep -o '"status":"ok"')
if [ -n "$HEALTH" ]; then
  echo "✅ Servidor funcionando correctamente"
else
  echo "❌ Error: El servidor no responde"
  exit 1
fi

# 6. Recargar nginx
echo ""
echo "📋 5. Recargando nginx..."
if systemctl is-active --quiet nginx; then
  sudo systemctl reload nginx
  echo "✅ Nginx recargado"
else
  sudo systemctl start nginx
  echo "✅ Nginx iniciado"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Despliegue completado"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://200.234.236.133"
echo "   Admin: http://200.234.236.133/admin/users"
echo ""
echo "🧪 AHORA INTENTA:"
echo "   1. Ve a http://200.234.236.133/admin/users"
echo "   2. Haz clic en un usuario"
echo "   3. Haz clic en 'Eliminar Usuario'"
echo "   4. Confirma la eliminación"
echo ""
echo "🔍 Para ver logs en tiempo real:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
