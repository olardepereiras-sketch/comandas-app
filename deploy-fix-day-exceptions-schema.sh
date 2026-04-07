#!/bin/bash

echo "🚀 ARREGLANDO ESQUEMA DE DAY_EXCEPTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Verificando variables de entorno..."
export DATABASE_URL="postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa"
export NODE_ENV="production"

echo "✅ Variables configuradas"
echo "  DATABASE_URL: postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa"

echo ""
echo "📋 Paso 2: Ejecutando script de arreglo de esquema..."
cd /var/www/reservamesa
bun backend/db/fix-day-exceptions-schema.ts

if [ $? -eq 0 ]; then
  echo "✅ Esquema arreglado exitosamente"
else
  echo "❌ Error arreglando esquema"
  exit 1
fi

echo ""
echo "📋 Paso 3: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2

nohup bun backend/server.ts > backend.log 2>&1 &
NEW_PID=$!
echo "✅ Servidor iniciado con PID: $NEW_PID"

echo ""
echo "📋 Paso 4: Esperando que el servidor inicie (3 segundos)..."
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ARREGLO COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Para ver los logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
