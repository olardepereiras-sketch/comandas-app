#!/bin/bash

echo "🔧 ARREGLANDO WHATSAPP AUTO-INICIO Y PANTALLA TOKEN"
echo "====================================================="

# Ubicación correcta del proyecto
PROJECT_DIR="/var/www/reservamesa"

echo "📋 Paso 1: Matando procesos existentes..."
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 2

echo "📋 Paso 2: Cambios aplicados:"
echo "  - Worker WhatsApp ahora inicia sesión automáticamente"
echo "  - Worker usa timeout de 30s para inicialización"
echo "  - Ruta de token registrada en layout principal"

echo "📋 Paso 3: Reiniciando servidor desde $PROJECT_DIR..."
cd "$PROJECT_DIR" || exit 1
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 5: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
   echo "✅ Servidor corriendo correctamente"
else
   echo "❌ Error: el servidor no está corriendo"
   echo ""
   echo "📋 Últimas líneas del log:"
   tail -n 30 "$PROJECT_DIR/backend.log"
   exit 1
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -n 20 "$PROJECT_DIR/backend.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR REINICIADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Cambios aplicados:"
echo "  ✅ WhatsApp se inicializa automáticamente al recibir reserva"
echo "  ✅ Timeout de 30s para esperar que sesión esté lista"
echo "  ✅ Pantalla de token ahora se muestra correctamente"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f $PROJECT_DIR/backend.log"
echo ""
