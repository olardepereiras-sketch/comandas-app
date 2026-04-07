#!/bin/bash

echo "🔧 Desplegando correcciones críticas"
echo "================================================"

echo ""
echo "📋 1. Ejecutando verificación y corrección de base de datos..."
cd /var/www/reservamesa
bun backend/db/fix-critical-issues.ts

if [ $? -ne 0 ]; then
  echo "❌ Error en las migraciones de base de datos"
  exit 1
fi

echo ""
echo "📦 2. Reconstruyendo el frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al construir el frontend"
  exit 1
fi

echo ""
echo "🔄 3. Reiniciando el servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🌐 4. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📊 Verificación de estado:"
echo "   - Base de datos: OK"
echo "   - Frontend: dist/ generado"
echo "   - Backend: Reiniciado"
echo ""
echo "🔍 Puedes ver los logs del servidor con:"
echo "   tail -f /var/www/reservamesa/backend.log"
