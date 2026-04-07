#!/bin/bash

echo "🔧 LIMPIANDO PROCESOS DE CHROME Y REINICIANDO WHATSAPP"
echo "======================================================"

echo "📋 Paso 1: Matando procesos de Chrome/Chromium..."
pkill -f "chrome.*whatsapp-sessions" || true
pkill -f "chromium.*whatsapp-sessions" || true
sleep 2

echo "📋 Paso 2: Limpiando archivos de bloqueo..."
find /var/www/reservamesa/whatsapp-sessions -name "SingletonLock" -delete 2>/dev/null || true
find /var/www/reservamesa/whatsapp-sessions -name "lockfile" -delete 2>/dev/null || true

echo "📋 Paso 3: Deteniendo servidor..."
pm2 stop reservamesa 2>/dev/null || pkill -f "bun.*backend" || true
sleep 2

echo "📋 Paso 4: Archivos modificados:"
echo "  - backend/services/whatsapp-web-manager.ts (Kill Chrome processes before init)"

echo "📋 Paso 5: Reiniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 6: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 7: Verificando estado..."
if pgrep -f "bun.*backend" > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "⚠️ El servidor puede no estar corriendo. Verifica los logs."
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -n 20 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ LIMPIEZA Y REINICIO COMPLETADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Procesos de Chrome limpiados antes de inicializar"
echo "  ✅ Archivos de bloqueo eliminados automáticamente"
echo "  ✅ Mejor manejo de errores en inicialización"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
