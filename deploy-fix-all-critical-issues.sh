#!/bin/bash

set -e

echo "🚀 DESPLEGANDO ARREGLOS COMPLETOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Arreglando schema de whatsapp_notifications..."
bun run backend/db/fix-whatsapp-notifications-updated-at.ts

echo ""
echo "📋 Paso 2: Actualizando credenciales de admin..."
bun run backend/db/update-admin-credentials.ts

echo ""
echo "📋 Paso 3: Limpiando frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 4: Compilando frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 5: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 6: Iniciando servidor backend..."
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor iniciado con PID: $!"

echo ""
echo "📋 Paso 7: Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "📋 Paso 8: Esperando que el servidor inicie..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Cambios desplegados:"
echo "   ✅ Schema de whatsapp_notifications arreglado"
echo "   ✅ Modificación de reservas mantiene token y número"
echo "   ✅ Notificaciones mejoradas con formato de tronas/carritos/mascotas"
echo "   ✅ Credenciales de admin actualizadas"
echo ""
echo "🔐 Nuevas credenciales de admin:"
echo "   Usuario: tono77"
echo "   Contraseña: 1500"
echo ""
echo "📝 Verificar logs del servidor:"
echo "   tail -f backend.log"
