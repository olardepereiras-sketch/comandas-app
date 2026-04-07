#!/bin/bash

echo "🚀 ARREGLANDO TODOS LOS PROBLEMAS CRÍTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Arreglando schema de la base de datos..."
bun run backend/db/fix-critical-schema.ts
if [ $? -ne 0 ]; then
  echo "❌ Error arreglando schema"
  exit 1
fi

echo ""
echo "📋 Paso 2: Limpiando cache del frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 3: Compilando frontend actualizado..."
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error compilando frontend"
  exit 1
fi

echo ""
echo "📋 Paso 4: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend iniciado con PID: $!"

echo ""
echo "📋 Paso 5: Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "📋 Paso 6: Esperando que el servidor inicie..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Verificando logs del backend..."
tail -20 backend.log
