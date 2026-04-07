#!/bin/bash
echo "🤖 ARREGLANDO CHATBOT & BANDEJA WHATSAPP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo "📋 Paso 1: Creando tabla whatsapp_chatbot_settings..."
sudo -u postgres psql -d reservamesa_db -f fix-chatbot-settings-table.sql
echo "✅ Tabla creada/verificada"

echo ""
echo "📋 Paso 2: Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 3: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
bun backend/server.ts > backend.log 2>&1 &
sleep 5
echo "✅ Servidor reiniciado"

echo ""
echo "📋 Paso 4: Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COMPLETADO"
echo ""
echo "🔍 Verificaciones:"
echo "  1. Admin panel: https://quieromesa.com/admin"
echo "     → El botón 'Chatbot & Bandeja WhatsApp' ahora navega correctamente"
echo "  2. Bandeja: https://quieromesa.com/admin/whatsapp-inbox"
echo "     → La configuración del chatbot carga sin error"
echo ""
echo "📡 Para que lleguen mensajes de WhatsApp al chatbot:"
echo "  - Configura en Meta: URL = https://quieromesa.com/api/webhooks/whatsapp"
echo "  - Verify Token = quieromesa_webhook_token"
echo "  - Subscribir a: messages"
echo ""
echo "Ver logs en tiempo real:"
echo "  tail -f backend.log"
