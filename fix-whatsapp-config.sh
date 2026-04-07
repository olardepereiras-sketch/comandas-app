#!/bin/bash

set -e

echo "🔧 Solucionando configuración de WhatsApp..."
echo ""

cd /var/www/reservamesa

echo "📋 1. Activando auto_send_whatsapp y use_whatsapp_web..."
bun run backend/db/fix-whatsapp-config.ts

echo ""
echo "📋 2. Verificando configuración..."
bun run backend/db/diagnose-whatsapp-config.ts

echo ""
echo "📋 3. Reiniciando servidor..."
pm2 restart reservamesa

echo ""
echo "✅ ¡Listo! Prueba crear una nueva reserva"
echo "   Las notificaciones de WhatsApp deberían enviarse automáticamente"
