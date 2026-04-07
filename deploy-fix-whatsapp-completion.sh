#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES CRÍTICAS"
echo "======================================"

echo "📋 Paso 1: Limpiando procesos Chrome bloqueados..."
pkill -f "chrome.*whatsapp-sessions" || true
pkill -f "chromium.*whatsapp-sessions" || true

echo "📋 Paso 2: Limpiando lockfiles de sesiones WhatsApp..."
find ./whatsapp-sessions -name "SingletonLock" -delete 2>/dev/null || true
find ./whatsapp-sessions -name "lockfile" -delete 2>/dev/null || true

echo "📋 Paso 3: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

echo "📋 Paso 4: Archivos modificados:"
echo "  - backend/services/reservation-completion-worker.ts (Validación timestamps)"
echo "  - backend/services/whatsapp-web-manager.ts (Limpieza lockfiles Chrome)"

echo "📋 Paso 5: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 6: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 7: Verificando estado..."
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor corriendo correctamente"
  echo ""
  echo "📋 Últimas líneas del log:"
  tail -n 20 backend.log
else
  echo "❌ Error: El servidor no está corriendo"
  echo ""
  echo "📋 Últimas líneas del log:"
  tail -n 50 backend.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Validación de timestamps en worker de completado"
echo "  ✅ Limpieza automática de lockfiles de Chrome"
echo "  ✅ Procesos Chrome bloqueados eliminados"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
