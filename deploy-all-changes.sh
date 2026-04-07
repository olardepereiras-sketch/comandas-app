#!/bin/bash

echo "🚀 DESPLEGANDO TODOS LOS CAMBIOS"
echo "=================================="

echo ""
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" || true

echo ""
echo "🗑️  2. Limpiando builds antiguos..."
rm -rf dist .expo

echo ""
echo "📋 3. Verificando variables de entorno..."
if [ -f "env" ]; then
  source env
  echo "   ✅ Archivo env cargado"
else
  echo "   ⚠️  Archivo env no encontrado"
fi

echo ""
echo "📦 4. Compilando frontend (~90 segundos)..."
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com bunx expo export -p web

if [ -d "dist" ]; then
  echo "   ✅ Build completado"
else
  echo "   ❌ Error: No se generó la carpeta dist"
  exit 1
fi

echo ""
echo "🚀 5. Iniciando backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

echo ""
echo "🌐 6. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "⚠️  IMPORTANTE: Limpia el caché del navegador"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Borra 'Imágenes y archivos en caché'"
echo "   3. Recarga la página"
echo ""
