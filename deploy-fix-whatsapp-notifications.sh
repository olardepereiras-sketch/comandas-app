#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES DE NOTIFICACIONES WHATSAPP"
echo "======================================================"

cd /var/www/reservamesa

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo "📋 Paso 2: Archivos modificados:"
echo "  - backend/services/reservation-completion-worker.ts (Fix SQL error)"
echo "  - backend/services/whatsapp-web-manager.ts (Wait for session ready)"

echo "📋 Paso 3: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 5: Verificando estado..."
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ El servidor no está corriendo"
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
echo "  ✅ Arreglado error SQL en worker de completar reservas"
echo "  ✅ WhatsApp ahora espera a que sesión esté ready antes de enviar"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
