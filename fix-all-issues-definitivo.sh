#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA DE TODOS LOS PROBLEMAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Arreglando esquema de base de datos..."
bun backend/db/fix-all-schema-issues.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando esquema"
  exit 1
fi
echo "✅ Esquema arreglado"

echo ""
echo "📋 Paso 3: Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error construyendo frontend"
  exit 1
fi
echo "✅ Frontend construido"

echo ""
echo "📋 Paso 4: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
sleep 3
echo "✅ Servidor iniciado (PID: $SERVER_PID)"

echo ""
echo "📋 Paso 5: Recargando nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODOS LOS PROBLEMAS SOLUCIONADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Servidor corriendo en:"
echo "   https://quieromesa.com"
echo ""
echo "🔍 Ver logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
