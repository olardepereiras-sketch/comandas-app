#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA DE WHATSAPP WEB FINAL"
echo "============================================="
echo ""

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1/7: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo ""

echo "📋 Paso 2/7: Detectando ruta de Chromium..."
if command -v chromium-browser &> /dev/null; then
    CHROMIUM_PATH=$(which chromium-browser)
    echo "✅ Chromium encontrado en: $CHROMIUM_PATH"
elif command -v chromium &> /dev/null; then
    CHROMIUM_PATH=$(which chromium)
    echo "✅ Chromium encontrado en: $CHROMIUM_PATH"
elif command -v google-chrome &> /dev/null; then
    CHROMIUM_PATH=$(which google-chrome)
    echo "✅ Google Chrome encontrado en: $CHROMIUM_PATH"
else
    echo "❌ Error: No se encontró Chromium o Chrome instalado"
    echo "   Por favor ejecuta primero: ./install-chrome-for-whatsapp.sh"
    exit 1
fi
echo ""

echo "📋 Paso 3/7: Configurando variable de entorno para Puppeteer..."
export PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH"
echo "export PUPPETEER_EXECUTABLE_PATH=\"$CHROMIUM_PATH\"" >> ~/.bashrc
echo "✅ Variable configurada: $PUPPETEER_EXECUTABLE_PATH"
echo ""

echo "📋 Paso 4/7: Instalando/verificando paquetes de npm..."
bun install whatsapp-web.js qrcode @types/qrcode
echo ""

echo "📋 Paso 5/7: Agregando campo use_whatsapp_web a la base de datos..."
if [ -f "backend/db/add-whatsapp-web-field.ts" ]; then
    bun backend/db/add-whatsapp-web-field.ts || echo "⚠️  Campo ya existe o error al agregar (continuando...)"
else
    echo "⚠️  Script de migración no encontrado, asumiendo que ya está aplicado"
fi
echo ""

echo "📋 Paso 6/7: Limpiando caché y reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web
echo ""

echo "📋 Paso 7/7: Reiniciando servidor con variable de entorno..."
PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH" bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Sistema de WhatsApp Web configurado:"
echo "   - Chromium/Chrome: $CHROMIUM_PATH"
echo "   - Cada restaurante puede conectar su propio WhatsApp"
echo "   - Ve a https://quieromesa.com/restaurant/config-pro"
echo "   - Activa 'Usar WhatsApp Web' y escanea el código QR"
echo ""
echo "💡 Monitoreando logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔍 Para verificar que funciona, busca en los logs:"
echo "   - '[WhatsApp Manager] Inicializando sesión'"
echo "   - '[WhatsApp Manager] 📱 Código QR generado'"
echo ""
