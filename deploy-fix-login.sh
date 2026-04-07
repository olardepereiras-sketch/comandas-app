#!/bin/bash

echo "🔧 REPARACIÓN COMPLETA - LOGIN Y PROVINCIAS"
echo "============================================="

cd /var/www/reservamesa

echo ""
echo "📋 PASO 1: Deteniendo servicios..."
pkill -f bun
sleep 2

echo ""
echo "📋 PASO 2: Limpiando TODOS los caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf dist
rm -rf node_modules/.vite

echo ""
echo "📋 PASO 3: Reinstalando dependencias críticas..."
bun install

echo ""
echo "📋 PASO 4: Verificando configuración tRPC..."
# Verificar que el archivo existe
if [ ! -f "lib/trpc.ts" ]; then
  echo "❌ lib/trpc.ts no encontrado"
  exit 1
fi

echo "✅ lib/trpc.ts encontrado"

echo ""
echo "📋 PASO 5: Exportando frontend (2-3 minutos)..."
bunx expo export -p web --clear

if [ ! -d "dist" ]; then
  echo "❌ Error: dist/ no fue creada"
  exit 1
fi

echo "✅ Frontend exportado exitosamente"

echo ""
echo "📋 PASO 6: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 PASO 7: Verificando backend..."
HEALTH=$(curl -s http://127.0.0.1:3000/api/health)
if [[ $HEALTH == *"ok"* ]]; then
  echo "✅ Backend funcionando correctamente"
else
  echo "❌ Backend no responde correctamente"
  tail -20 backend.log
  exit 1
fi

echo ""
echo "📋 PASO 8: Verificando endpoint tRPC..."
TRPC_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/trpc)
echo "Código HTTP del endpoint tRPC: $TRPC_TEST"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://200.234.236.133"
echo "   Admin: http://200.234.236.133/admin/login"
echo "   Provincias: http://200.234.236.133/admin/locations"
echo ""
echo "🔑 Credenciales:"
echo "   Usuario: tono"
echo "   Password: 1234"
echo ""
echo "📊 Logs en tiempo real:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
