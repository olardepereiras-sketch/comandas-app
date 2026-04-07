#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES RÁPIDAS DE WHATSAPP"
echo "======================================================"

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/index.ts" || true
sleep 2

echo ""
echo "📋 Paso 2: Archivos modificados:"
echo "  - backend/services/reservation-completion-worker.ts (Fix timestamp parsing)"
echo "  - backend/services/whatsapp-notification-worker.ts (Reintentos cada 1 minuto)"
echo "  - backend/services/whatsapp-web-manager.ts (Espera reducida a 10s)"

echo ""
echo "📋 Paso 3: Reiniciando servidor..."
nohup bun run backend/index.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo ""
echo "📋 Paso 5: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
   echo "✅ Servidor corriendo correctamente"
else
   echo "⚠️ El servidor puede no estar corriendo. Verifica los logs."
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -n 30 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Arreglado error de timestamp en completion worker"
echo "  ✅ Reintentos de WhatsApp cada 1 minuto (antes 5 minutos)"
echo "  ✅ Worker de WhatsApp revisa cada 10 segundos"
echo "  ✅ Espera de sesión reducida a 10 segundos (antes 30s)"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
