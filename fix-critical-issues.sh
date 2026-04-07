#!/bin/bash

echo "🔧 Solución Definitiva - Borrado y Cancelación"
echo "════════════════════════════════════════════════════════════════"

# 1. Iniciar nginx
echo ""
echo "📋 1. Iniciando nginx..."
sudo systemctl start nginx
if sudo systemctl is-active --quiet nginx; then
  echo "✅ Nginx iniciado correctamente"
else
  echo "❌ Error iniciando nginx"
  echo "   Intentando instalar nginx..."
  sudo apt update
  sudo apt install -y nginx
  sudo systemctl start nginx
  sudo systemctl enable nginx
fi

# 2. Cargar variables de entorno
echo ""
echo "📋 2. Cargando variables de entorno..."
export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables cargadas"

# 3. Detener procesos anteriores
echo ""
echo "📋 3. Deteniendo procesos anteriores..."
pkill -f "bun.*backend/server.ts" || echo "   No había procesos"

# 4. Compilar frontend
echo ""
echo "📋 4. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend compilado"

# 5. Iniciar servidor
echo ""
echo "📋 5. Iniciando servidor con logs detallados..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"
sleep 3

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado correctamente"
else
  echo "❌ Error iniciando servidor"
  echo "   Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

# 6. Recargar nginx
echo ""
echo "📋 6. Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

# 7. Probar el health check
echo ""
echo "📋 7. Verificando health check..."
sleep 2
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if [ -n "$HEALTH_RESPONSE" ]; then
  echo "✅ Health check OK: $HEALTH_RESPONSE"
else
  echo "❌ Health check falló"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Servidor configurado"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://200.234.236.133"
echo "   Admin: http://200.234.236.133/admin"
echo "   API: http://200.234.236.133/api"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log | grep -E '(🔵|✅|❌|DELETE|CANCEL)'"
echo ""
echo "🧪 Ahora intenta:"
echo "   1. Ir a http://200.234.236.133/admin/users"
echo "   2. Hacer clic en un usuario"
echo "   3. Hacer clic en 'Eliminar Usuario'"
echo "   4. Ver los logs: tail -f backend.log | grep DELETE"
echo ""
