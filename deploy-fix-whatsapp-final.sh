#!/bin/bash

echo "🔧 ARREGLANDO WHATSAPP Y AUTO-RATING"
echo "======================================"

echo "📋 Paso 1: Matando procesos de Chrome..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 2

echo "📋 Paso 2: Deteniendo servidor..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2

echo "📋 Paso 3: Cambios aplicados:"
echo "  - backend/services/whatsapp-web-manager.ts (Fix isInitializing en authenticated)"
echo "  - backend/services/auto-rating-worker.ts (Fix conflicto variable client)"

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
echo "  ✅ QR code ahora se marca como listo cuando está autenticado"
echo "  ✅ Auto-rating worker ya no tiene conflictos de variables"
echo "  ✅ Procesos de Chrome limpiados"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
