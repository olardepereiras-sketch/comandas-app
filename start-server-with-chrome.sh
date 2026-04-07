#!/bin/bash

echo "🚀 INICIANDO SERVIDOR CON SOPORTE PARA WHATSAPP WEB"
echo "===================================================="
echo ""

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1/3: Deteniendo servidor existente..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo ""

echo "📋 Paso 2/3: Detectando ruta de Chrome/Chromium..."
if command -v chromium-browser &> /dev/null; then
    CHROMIUM_PATH=$(which chromium-browser)
    echo "✅ Chromium encontrado: $CHROMIUM_PATH"
elif command -v chromium &> /dev/null; then
    CHROMIUM_PATH=$(which chromium)
    echo "✅ Chromium encontrado: $CHROMIUM_PATH"
elif command -v google-chrome &> /dev/null; then
    CHROMIUM_PATH=$(which google-chrome)
    echo "✅ Google Chrome encontrado: $CHROMIUM_PATH"
else
    echo "❌ Error: No se encontró Chrome/Chromium"
    echo "   Ejecuta: ./install-chrome-for-whatsapp.sh"
    exit 1
fi
echo ""

echo "📋 Paso 3/3: Iniciando servidor..."
PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH" bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "✅ SERVIDOR INICIADO"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
