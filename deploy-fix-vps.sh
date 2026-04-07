#!/bin/bash

set -e

echo "🚀 DEPLOY COMPLETO - RESERVAMESA"
echo "=================================="
echo ""

cd /var/www/reservamesa

echo "📋 PASO 1: Deteniendo procesos..."
pkill -f "bun backend/server.ts" 2>/dev/null || true
pkill -f "bun.*hono" 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo "✅ Procesos detenidos"
echo ""

echo "📋 PASO 2: Limpiando instalación anterior..."
rm -rf node_modules
rm -rf .expo
rm -rf dist
echo "✅ Limpieza completa"
echo ""

echo "📋 PASO 3: Instalando dependencias correctas..."
bun install
echo "✅ Dependencias instaladas"
echo ""

echo "📋 PASO 4: Verificando versiones..."
echo "tRPC client: $(bun pm ls | grep @trpc/client | head -n1)"
echo "tRPC server: $(bun pm ls | grep @trpc/server | head -n1)"
echo "React Query: $(bun pm ls | grep @tanstack/react-query | head -n1)"
echo ""

echo "📋 PASO 5: Reconstruyendo frontend..."
CI=1 EXPO_PUBLIC_API_URL=http://200.234.236.133 bunx expo export --platform web --output-dir dist
echo "✅ Frontend reconstruido"
echo ""

echo "📋 PASO 6: Verificando archivos..."
if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: dist/index.html no encontrado"
    exit 1
fi
echo "✅ Archivos verificados"
echo ""

echo "📋 PASO 7: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID del backend: $BACKEND_PID"
sleep 3

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Error: Backend falló al iniciar"
    echo "Ver logs:"
    tail -n 50 backend.log
    exit 1
fi

echo "✅ Backend iniciado correctamente"
echo ""

echo "📋 PASO 8: Verificando endpoints..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Health Check: OK"
else
    echo "❌ API Health Check falló (HTTP $HTTP_CODE)"
    tail -n 30 backend.log
    exit 1
fi

echo ""
echo "✅ ¡DEPLOY COMPLETADO CON ÉXITO!"
echo "=================================="
echo ""
echo "🌐 Frontend: http://200.234.236.133"
echo "📡 API: http://200.234.236.133/api"
echo "🔧 tRPC: http://200.234.236.133/api/trpc"
echo "🏥 Health: http://200.234.236.133/api/health"
echo ""
echo "📊 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🛑 Para detener el backend:"
echo "   pkill -f 'bun backend/server.ts'"
echo ""
