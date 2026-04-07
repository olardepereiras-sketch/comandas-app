#!/bin/bash

echo "🔧 Desplegando corrección de Configuración Pro"
echo "================================================"
echo ""

echo "📦 1. Reconstruyendo el frontend..."
rm -rf dist .expo
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir frontend"
  exit 1
fi
echo "✅ Frontend reconstruido"
echo ""

echo "🔄 2. Reiniciando el servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend reiniciado"
echo ""

echo "🌐 3. Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Ahora prueba el diagnóstico con:"
echo "   chmod +x run-date-diagnosis.sh"
echo "   ./run-date-diagnosis.sh"
