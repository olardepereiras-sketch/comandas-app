#!/bin/bash

echo "🔒 DEPLOYMENT FINAL CON HTTPS"
echo "=============================="
echo ""

# 1. Detener servicios
echo "⏹️  1. Deteniendo servicios..."
sudo systemctl stop nginx
pkill -f "bun.*backend/server.ts" || true

# 2. Limpiar todo
echo "🗑️  2. Limpiando builds antiguos..."
rm -rf dist/ .expo/

# 3. Cargar variables de entorno
echo "📋 3. Cargando variables de entorno..."
export $(grep -v '^#' env | xargs)
echo "   ✅ EXPO_PUBLIC_RORK_API_BASE_URL=$EXPO_PUBLIC_RORK_API_BASE_URL"

# 4. Compilar frontend
echo "📦 4. Compilando frontend con HTTPS (~90 segundos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
    echo "   ❌ Error al compilar frontend"
    exit 1
fi

BUNDLE=$(find dist/_expo/static/js/web/ -name "entry-*.js" 2>/dev/null | head -1)
if [ -z "$BUNDLE" ]; then
    echo "   ❌ No se generó el bundle"
    exit 1
fi

echo "   ✅ Bundle generado: $(basename $BUNDLE)"

# 5. Iniciar backend
echo "🚀 5. Iniciando backend..."
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "   ❌ Backend no se inició correctamente"
    cat backend.log | tail -20
    exit 1
fi

# 6. Verificar nginx
echo "🌐 6. Verificando configuración de Nginx..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "   ❌ Error en configuración de Nginx"
    exit 1
fi

# 7. Iniciar nginx
echo "🔄 7. Iniciando Nginx..."
sudo systemctl start nginx

# 8. Verificar que HTTPS funciona
echo "🧪 8. Verificando HTTPS..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://quieromesa.com || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "   ✅ HTTPS funciona correctamente (HTTP $HTTP_CODE)"
else
    echo "   ⚠️  HTTPS responde con código: $HTTP_CODE"
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL HTTPS: https://quieromesa.com"
echo "📄 Bundle: $(basename $BUNDLE)"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "⚠️  IMPORTANTE - Limpia el caché del navegador:"
echo "   1. Presiona Ctrl+Shift+Delete"
echo "   2. Borra 'Imágenes y archivos en caché'"
echo "   3. Cierra COMPLETAMENTE el navegador"
echo "   4. Abre https://quieromesa.com de nuevo"
echo ""
echo "   O mejor: Abre en modo incógnito"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔐 Verificar certificado SSL:"
echo "   curl -vI https://quieromesa.com"
echo ""
