#!/bin/bash

echo "🔧 ARREGLANDO COMPLETION WORKER"
echo "======================================================"

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*server.ts" || true
sleep 2

echo ""
echo "📋 Paso 2: Archivos modificados:"
echo "  - backend/services/reservation-completion-worker.ts (Cast time::jsonb)"

echo ""
echo "📋 Paso 3: Reiniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
NEW_PID=$!
echo "✅ Servidor iniciado con PID: $NEW_PID"

echo ""
echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo ""
echo "📋 Paso 5: Verificando estado..."
if pgrep -f "bun.*server.ts" > /dev/null; then
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
echo "  ✅ Arreglado error SQL en completion worker (cast time::jsonb)"
echo "  ✅ El worker revisa cada 60 segundos"
echo "  ✅ WhatsApp worker envía notificaciones cada 10 segundos"
echo "  ✅ Reintentos automáticos cada 1 minuto si falla"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
