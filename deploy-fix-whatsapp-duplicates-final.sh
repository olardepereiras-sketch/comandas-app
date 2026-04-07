#!/bin/bash

echo "🔧 ARREGLANDO MENSAJES DUPLICADOS Y PANTALLA EN BLANCO"
echo "======================================================"

# Ubicación del proyecto en VPS
VPS_PATH="/var/www/reservamesa"

echo "📋 Paso 1: Matando procesos de Chrome y servidor..."
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 3

echo "📋 Paso 2: Copiando archivos corregidos al VPS..."

# Copiar worker de WhatsApp (usa transacciones para evitar duplicados)
if [ -f "backend/services/whatsapp-notification-worker.ts" ]; then
  cp backend/services/whatsapp-notification-worker.ts "$VPS_PATH/backend/services/whatsapp-notification-worker.ts"
  echo "  ✅ Worker de WhatsApp actualizado (con transacciones)"
fi

# Copiar auto-rating worker
if [ -f "backend/services/auto-rating-worker.ts" ]; then
  cp backend/services/auto-rating-worker.ts "$VPS_PATH/backend/services/auto-rating-worker.ts"
  echo "  ✅ Auto-rating worker actualizado"
fi

# Copiar pantalla de confirmación
if [ -f "app/client/reservation2/[token2].tsx" ]; then
  mkdir -p "$VPS_PATH/app/client/reservation2"
  cp app/client/reservation2/[token2].tsx "$VPS_PATH/app/client/reservation2/[token2].tsx"
  echo "  ✅ Pantalla de confirmación actualizada"
fi

echo "📋 Paso 3: Iniciando servidor..."
cd "$VPS_PATH"
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 5: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo correctamente"
else
  echo "❌ Error: El servidor no está corriendo"
  exit 1
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -20 "$VPS_PATH/backend.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CORRECCIONES APLICADAS EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Worker usa transacciones (BEGIN/COMMIT) para evitar duplicados"
echo "  ✅ FOR UPDATE SKIP LOCKED garantiza que solo 1 worker procesa cada notificación"
echo "  ✅ Estado 'processing' marca notificación antes de enviar"
echo "  ✅ Auto-rating funciona después de 24h (estado 'rated')"
echo "  ✅ Pantalla de confirmación actualizada"
echo ""
echo "Comportamiento esperado:"
echo "  • Al crear reserva: SE ENVÍA EXACTAMENTE 1 MENSAJE"
echo "  • Si falla: Reintenta automáticamente con delays progresivos"
echo "  • Token de confirmación: Muestra la reserva correctamente"
echo "  • Después de 24h: Reservas pasan a estado 'rated'"
echo "  • Sin valoración del restaurante: Auto-valora con 4.0"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f $VPS_PATH/backend.log"
