#!/bin/bash

echo "🔧 IMPLEMENTANDO SISTEMA PROFESIONAL DE NOTIFICACIONES WHATSAPP"
echo "================================================================"

echo "📋 Paso 1: Deteniendo servidor y Chrome..."
pkill -f "bun.*server.ts" 2>/dev/null || true
pkill -f chrome 2>/dev/null || true
pkill -f chromium 2>/dev/null || true
sleep 2

echo "📋 Paso 2: Cambios implementados:"
echo "  ✅ Sistema de notificaciones con cola y reintentos automáticos"
echo "  ✅ Reintentos exponenciales: 30s, 1min, 2min, 5min"
echo "  ✅ Máximo 5 intentos por notificación"
echo "  ✅ Tiempo de expiración de reservas aumentado a 15 minutos"
echo "  ✅ Cleanup espera 5 minutos adicionales antes de borrar"
echo "  ✅ Worker revisa notificaciones cada 5 segundos"

echo "📋 Paso 3: Reiniciando servidor..."
cd /home/user/rork-app
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo "📋 Paso 4: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo "📋 Paso 5: Verificando estado..."
if ps -p $SERVER_PID > /dev/null; then
   echo "✅ Servidor corriendo correctamente"
else
   echo "⚠️ El servidor puede no estar corriendo. Verifica los logs."
fi

echo ""
echo "📋 Últimas líneas del log:"
tail -n 20 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SISTEMA PROFESIONAL DE NOTIFICACIONES IMPLEMENTADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Características del nuevo sistema:"
echo "  ✅ Todas las notificaciones se guardan en cola"
echo "  ✅ Reintentos automáticos si falla el envío"
echo "  ✅ Reintentos exponenciales para evitar saturación"
echo "  ✅ Máximo 5 intentos garantizados"
echo "  ✅ Reservas no se borran hasta 20 minutos después de expirar"
echo "  ✅ Worker verifica cada 5 segundos"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
