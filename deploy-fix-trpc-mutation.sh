#!/bin/bash

echo "🔧 Fix tRPC Mutations - Solución Definitiva"
echo "════════════════════════════════════════════════════════════════"

# Cargar variables de entorno
if [ -f .env ]; then
  echo "📋 Cargando variables de entorno..."
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas"
else
  echo "❌ Archivo .env no encontrado"
  exit 1
fi

# Detener procesos
echo ""
echo "📋 1. Deteniendo procesos..."
pkill -f "bun.*backend/server.ts" || true
echo "✅ Procesos detenidos"

# Limpiar frontend
echo ""
echo "📋 2. Limpiando y compilando frontend..."
rm -rf dist .expo
bunx expo export -p web > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Frontend compilado"
else
  echo "❌ Error compilando frontend"
  exit 1
fi

# Iniciar servidor
echo ""
echo "📋 3. Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"

# Esperar a que el servidor inicie
sleep 3

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null 2>&1; then
  echo "✅ Servidor iniciado"
else
  echo "❌ Servidor no pudo iniciar"
  echo "Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

# Recargar nginx
echo ""
echo "📋 4. Recargando nginx..."
sudo systemctl reload nginx 2>/dev/null || sudo systemctl start nginx 2>/dev/null || echo "⚠️  Nginx no disponible"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Despliegue completado"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log | grep -E '(DELETE|CANCEL|🔵|✅|❌)'"
echo ""
echo "🧪 Ahora intenta:"
echo "   1. Abre http://200.234.236.133/admin/users"
echo "   2. Intenta eliminar un usuario"
echo "   3. Deberías ver '🔵 [DELETE CLIENT] INICIO' en los logs"
echo ""
