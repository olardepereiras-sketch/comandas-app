#!/bin/bash

echo "🔄 Reiniciando servidor..."

echo "📋 Paso 1: Deteniendo procesos existentes..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo "📋 Paso 2: Verificando puerto 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
  echo "⚠️ Puerto 3000 todavía en uso, intentando liberar..."
  fuser -k 3000/tcp
  sleep 2
fi

echo "📋 Paso 3: Iniciando servidor..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &

sleep 3

echo "📋 Paso 4: Verificando conexión..."
if lsof -i :3000 > /dev/null 2>&1; then
  echo "✅ Servidor iniciado correctamente en puerto 3000"
  echo ""
  echo "📋 Mostrando últimas líneas del log:"
  tail -20 /var/www/reservamesa/backend.log
else
  echo "❌ Error: El servidor no está corriendo"
  echo "📋 Mostrando log completo:"
  cat /var/www/reservamesa/backend.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR REINICIADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f /var/www/reservamesa/backend.log"
