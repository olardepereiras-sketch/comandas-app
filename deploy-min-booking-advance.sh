#!/bin/bash

echo "🚀 Desplegando actualización de tiempo mínimo de anticipación"
echo "============================================================="
echo ""

echo "📋 1. Agregando columna a la base de datos..."
bun backend/db/add-min-booking-advance.ts

if [ $? -ne 0 ]; then
  echo "❌ Error al agregar columna"
  exit 1
fi

echo ""
echo "📦 2. Reconstruyendo el frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir frontend"
  exit 1
fi

echo ""
echo "🔄 3. Reiniciando el servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🌐 4. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Prueba el diagnóstico de fechas con:"
echo "   chmod +x run-date-diagnosis.sh"
echo "   ./run-date-diagnosis.sh"
