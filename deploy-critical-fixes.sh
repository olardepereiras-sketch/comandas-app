#!/bin/bash

echo "🔧 Desplegando correcciones críticas"
echo "================================================"
echo ""

echo "📦 Reconstruyendo el frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al construir el frontend"
  exit 1
fi

echo "✅ Frontend reconstruido"
echo ""

echo "🔄 Reiniciando el servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "✅ Backend reiniciado"
echo ""

echo "🌐 Recargando Nginx..."
sudo systemctl reload nginx

echo "✅ Nginx recargado"
echo ""

echo "✅ Despliegue completado exitosamente"
echo ""
echo "📊 Cambios aplicados:"
echo "   - ✅ Corregido error de tableRotationTime en configuración pro"
echo "   - ✅ Corregido persistencia de días abiertos/cerrados"
echo "   - ✅ Corregido visualización de turnos configurados"
echo ""
echo "🔍 Verifica los logs del servidor con:"
echo "   tail -f backend.log"
