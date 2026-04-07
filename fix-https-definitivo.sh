#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Arreglando HTTPS"
echo "=========================================="

# 1. Detener todo
echo "⏹️  1. Deteniendo servicios..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sleep 2

# 2. Limpiar builds
echo "🗑️  2. Limpiando builds antiguos..."
rm -rf dist .expo node_modules/.cache 2>/dev/null || true

# 3. Exportar variables de entorno
echo "📋 3. Exportando variables HTTPS..."
export EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
export EXPO_PUBLIC_API_URL=https://quieromesa.com
export NODE_ENV=production

echo "   ✅ EXPO_PUBLIC_RORK_API_BASE_URL=$EXPO_PUBLIC_RORK_API_BASE_URL"
echo "   ✅ EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL"

# 4. Compilar frontend
echo "📦 4. Compilando frontend (~90 segundos)..."
npx expo export -p web --output-dir dist --clear 2>&1 | grep -E "(Bundled|Error|warning:)" || true

if [ -d "dist" ]; then
    BUNDLE_FILE=$(ls dist/_expo/static/js/web/*.js 2>/dev/null | head -1)
    if [ -n "$BUNDLE_FILE" ]; then
        BUNDLE_NAME=$(basename "$BUNDLE_FILE")
        echo "   ✅ Bundle generado: $BUNDLE_NAME"
        
        # Verificar que use HTTPS
        if grep -q "https://quieromesa.com" "$BUNDLE_FILE"; then
            echo "   ✅ Bundle usa HTTPS correctamente"
        else
            echo "   ⚠️  Advertencia: No se detectó HTTPS en el bundle"
        fi
    else
        echo "   ❌ No se generó el bundle"
        exit 1
    fi
else
    echo "   ❌ No se generó la carpeta dist"
    exit 1
fi

# 5. Iniciar backend con variables
echo "🚀 5. Iniciando backend..."
cd /var/www/reservamesa
export EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
export EXPO_PUBLIC_API_URL=https://quieromesa.com
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    echo "   ✅ Backend PID: $BACKEND_PID"
else
    echo "   ❌ Error iniciando backend"
    tail -20 backend.log
    exit 1
fi

# 6. Reiniciar Nginx
echo "🌐 6. Reiniciando Nginx..."
sudo nginx -t 2>&1 | grep -E "(ok|successful)"
sudo systemctl restart nginx
sleep 2

if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx activo"
else
    echo "   ❌ Error con Nginx"
    exit 1
fi

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URL: https://quieromesa.com"
echo "📄 Bundle: $BUNDLE_NAME"
echo "🔧 Backend PID: $BACKEND_PID"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Abre https://quieromesa.com en modo INCÓGNITO"
echo "   2. Presiona Ctrl+Shift+R para recargar sin caché"
echo "   3. Abre F12 y verifica que NO haya errores de Mixed Content"
echo ""
echo "🧪 PRUEBA:"
echo "   1. Intenta borrar una provincia → Debe pedir confirmación"
echo "   2. Verifica que los enlaces en emails usen HTTPS"
echo ""
echo "📝 Ver logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
