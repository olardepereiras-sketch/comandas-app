#!/bin/bash

echo "🔧 DESPLEGANDO SISTEMA DE WHATSAPP WEB POR RESTAURANTE"
echo "======================================================"
echo ""

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo ""

echo "📋 Paso 2/5: Instalando dependencias necesarias..."
bun install whatsapp-web.js qrcode @types/qrcode
echo ""

echo "📋 Paso 3/5: Agregando campo use_whatsapp_web a la base de datos..."
bun backend/db/add-whatsapp-web-field.ts
echo ""

echo "📋 Paso 4/5: Limpiando caché y reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web
echo ""

echo "📋 Paso 5/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Sistema de WhatsApp Web configurado:"
echo "   - Cada restaurante puede conectar su propio WhatsApp"
echo "   - Ve a https://quieromesa.com/restaurant/config-pro"
echo "   - Activa 'Usar WhatsApp Web' y escanea el código QR"
echo ""
echo "💡 Monitoreando logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
