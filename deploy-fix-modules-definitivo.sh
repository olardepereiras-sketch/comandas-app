#!/bin/bash

echo "🔧 ARREGLANDO MÓDULOS DEL SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Error: No se encontró archivo env"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL no está configurada"
  exit 1
fi

echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Arreglando módulos..."
bun backend/db/fix-modules-definitivo.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando módulos"
  exit 1
fi

echo ""
echo "📋 Paso 4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor iniciado (PID: $SERVER_PID)"
else
  echo "❌ Error: El servidor no pudo iniciarse"
  echo "Últimas líneas del log:"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MÓDULOS ARREGLADOS CORRECTAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Para ver logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
