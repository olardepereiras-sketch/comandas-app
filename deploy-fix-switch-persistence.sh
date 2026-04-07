#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE SWITCHES DE WHATSAPP"
echo "=================================================="

echo ""
echo "📋 Paso 1/3: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true

echo ""
echo "📋 Paso 2/3: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web

echo ""
echo "📋 Paso 3/3: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 2
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "🔍 Verificación:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa 'Usar WhatsApp Web' → debe quedarse activado"
echo "   3. Escanea el código QR"
echo "   4. Activa 'Envío Automático de WhatsApp' → debe quedarse activado"
echo "   5. Recarga la página → los switches deben mantener su estado"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
