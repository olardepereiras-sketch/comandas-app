#!/bin/bash

# Script para solucionar la pantalla en blanco del token de confirmación
# Ubicación: /var/www/reservamesa

echo "🔧 SOLUCIONANDO PANTALLA EN BLANCO DEL TOKEN"
echo "=============================================="

# Paso 1: Detener servidor
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*server.ts"
sleep 2

# Paso 2: Limpiar procesos de Chrome
echo "📋 Paso 2: Limpiando procesos de Chrome..."
pkill -f chrome
pkill -f chromium
sleep 2

# Paso 3: Verificar cambios
echo "📋 Paso 3: Los cambios ya están aplicados:"
echo "  - backend/trpc/routes/reservations/get-by-token2/route.ts (Logs detallados)"
echo "  - app/client/reservation2/[token2].tsx (Logs mejorados)"

# Paso 4: Reiniciar servidor
echo "📋 Paso 4: Reiniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

# Paso 5: Esperar inicio
echo "📋 Paso 5: Esperando inicio del servidor (15 segundos)..."
sleep 15

# Paso 6: Verificar estado
echo "📋 Paso 6: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ Error: El servidor no está corriendo"
    exit 1
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -20 /var/www/reservamesa/backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR REINICIADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
echo "Ahora prueba a crear una reserva y usar el enlace del token."
echo "Los logs mostrarán exactamente qué datos se están enviando."
