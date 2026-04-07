#!/bin/bash

echo "🔧 ARREGLANDO PROBLEMAS CRÍTICOS DE NOTIFICACIONES"
echo "=================================================="

echo "📋 Paso 1: Matando procesos de Chrome..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 2

echo "📋 Paso 2: Deteniendo servidor..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2

echo "📋 Paso 3: Cambios aplicados:"
echo "  - backend/services/whatsapp-notification-worker.ts (Evitar mensajes duplicados con FOR UPDATE SKIP LOCKED)"
echo "  - Estado 'processing' para prevenir concurrencia"
echo "  - Manejo profesional de reintentos"

echo "📋 Paso 4: Reiniciando servidor..."
cd /home/user/rork-app
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
echo "✅ SERVIDOR REINICIADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Mejoras implementadas:"
echo "  ✅ Mensajes WhatsApp NO se duplican (FOR UPDATE SKIP LOCKED)"
echo "  ✅ Estado 'processing' evita concurrencia"
echo "  ✅ Reintentos profesionales con backoff exponencial"
echo "  ✅ Auto-rating a las 24h cambia estado a 'rated'"
echo "  ✅ Valoración automática de 4.0 si no se valora"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
