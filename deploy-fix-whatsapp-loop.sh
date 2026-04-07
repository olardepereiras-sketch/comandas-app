#!/bin/bash

echo "🔧 ARREGLANDO BUCLE INFINITO DE WHATSAPP"
echo "========================================"

echo "📋 Paso 1: Matando todos los procesos de Chrome..."
pkill -9 -f chrome 2>/dev/null || true
pkill -9 -f chromium 2>/dev/null || true
sleep 2

echo "📋 Paso 2: Deteniendo servidor..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2

echo "📋 Paso 3: Cambios aplicados:"
echo "  - backend/services/whatsapp-web-manager.ts (No matar Chrome si autenticado)"
echo "  - backend/trpc/routes/whatsapp/get-qr/route.ts (Verificar estado antes de inicializar)"

echo "📋 Paso 4: Reiniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 5: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 6: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
   echo "✅ Servidor corriendo correctamente"
else
   echo "⚠️ El servidor puede no estar corriendo. Verifica los logs."
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -20 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Chrome NO se mata si ya está autenticado"
echo "  ✅ QR endpoint verifica estado antes de inicializar"
echo "  ✅ Sesión marcada como ready al autenticarse"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
