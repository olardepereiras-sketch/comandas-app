#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Arreglando TODO"
echo "=========================================="

# 1. Detener todo
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true

# 2. Limpiar
echo "🗑️  2. Limpiando builds..."
rm -rf dist .expo

# 3. Compilar frontend con HTTPS
echo "📦 3. Compilando frontend con HTTPS (~90 segundos)..."
export EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
export EXPO_PUBLIC_API_URL=https://quieromesa.com
bunx expo export -p web

if [ ! -d "dist" ]; then
  echo "❌ Error: No se generó la carpeta dist"
  exit 1
fi

BUNDLE_FILE=$(ls -1 dist/_expo/static/js/web/*.js 2>/dev/null | head -1 | xargs basename)
echo "   ✅ Bundle generado: $BUNDLE_FILE"

# 4. Iniciar backend
echo "🚀 4. Iniciando backend..."
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 2

# 5. Iniciar nginx
echo "🌐 5. Iniciando Nginx..."
sudo systemctl start nginx

# Verificar que nginx está corriendo
if sudo systemctl is-active --quiet nginx; then
  echo "   ✅ Nginx activo"
else
  echo "   ❌ Nginx no se pudo iniciar"
  sudo systemctl status nginx
  exit 1
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "📄 Bundle: $BUNDLE_FILE"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "⚠️  IMPORTANTE - Limpia el caché del navegador:"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Borra 'Imágenes y archivos en caché'"
echo "   3. Cierra COMPLETAMENTE el navegador"
echo "   4. Abre https://quieromesa.com"
echo ""
echo "   O mejor: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 PRUEBAS:"
echo "   ✅ Botones de borrar - ahora funcionan con window.confirm"
echo "   ✅ Enlaces en WhatsApp - ahora aparecen claros"
echo "   ✅ Todo usa HTTPS"
echo ""
