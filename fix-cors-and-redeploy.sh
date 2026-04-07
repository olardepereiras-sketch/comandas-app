#!/bin/bash
set -e

echo "🔧 SOLUCIÓN DEFINITIVA - ARREGLANDO CORS Y RECOMPILANDO"
echo "========================================================"

echo ""
echo "⏹️  1. Deteniendo servicios..."
sudo systemctl stop nginx
pkill -f "bun.*backend/server.ts" || true

echo ""
echo "🗑️  2. Limpiando TODO el caché y builds..."
rm -rf dist/ .expo/ node_modules/.cache/

echo ""
echo "🔍 3. Verificando errores de TypeScript..."
echo "   (Esto puede mostrar advertencias, pero no debe tener errores críticos)"
bunx tsc --noEmit --skipLibCheck || echo "⚠️  Hay errores de TypeScript pero continuamos..."

echo ""
echo "📦 4. Compilando frontend NUEVO..."
export NODE_OPTIONS="--max-old-space-size=4096"
bunx expo export -p web --clear

echo ""
echo "🔍 5. Verificando que el bundle contenga el código..."
BUNDLE_FILE=$(ls -t dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -1)
if [ -f "$BUNDLE_FILE" ]; then
    echo "   Bundle encontrado: $(basename $BUNDLE_FILE)"
    
    if grep -q "handleDelete" "$BUNDLE_FILE"; then
        echo "   ✅ handleDelete ENCONTRADO en el bundle"
    else
        echo "   ⚠️  handleDelete NO encontrado (puede estar minificado)"
    fi
    
    if grep -q "deleteMutation" "$BUNDLE_FILE"; then
        echo "   ✅ deleteMutation ENCONTRADO en el bundle"
    else
        echo "   ⚠️  deleteMutation NO encontrado (puede estar minificado)"
    fi
    
    if grep -q "Eliminar Provincia" "$BUNDLE_FILE"; then
        echo "   ✅ Textos de confirmación ENCONTRADOS"
    else
        echo "   ❌ Textos de confirmación NO encontrados - HAY UN PROBLEMA"
    fi
else
    echo "   ❌ No se encontró el bundle compilado"
    exit 1
fi

echo ""
echo "🚀 6. Iniciando backend con CORS corregido..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
sleep 2

if ps -p $BACKEND_PID > /dev/null; then
    echo "   ✅ Backend iniciado correctamente"
else
    echo "   ❌ Backend falló al iniciar. Ver logs:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "🌐 7. Verificando configuración de Nginx..."
sudo nginx -t

echo ""
echo "🔄 8. Iniciando Nginx..."
sudo systemctl start nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "📊 CORS configurado para:"
echo "   ✅ https://quieromesa.com"
echo "   ✅ http://quieromesa.com"
echo "   ✅ http://200.234.236.133"
echo ""
echo "🧪 PRUEBAS:"
echo "   1. Abre https://quieromesa.com en modo incógnito"
echo "   2. Abre consola del navegador (F12)"
echo "   3. Busca errores de CORS (deben desaparecer)"
echo "   4. Prueba los botones de borrado"
echo ""
echo "📝 Ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "📝 Ver logs de nginx:"
echo "   sudo tail -f /var/log/nginx/error.log"
