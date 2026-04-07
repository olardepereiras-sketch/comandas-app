#!/bin/bash

echo "🔧 CORRECCIÓN Y DEPLOY - RESERVAMESA"
echo "====================================="
echo ""

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1: Deteniendo todos los procesos..."
pkill -f "bun backend/server.ts" 2>/dev/null || true
pkill -f "bun.*hono" 2>/dev/null || true
pkill -f "bun.*server" 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo "✅ Procesos detenidos"
echo ""

echo "📋 Paso 2: Respaldo de archivos críticos..."
cp .env .env.backup 2>/dev/null || true
echo "✅ Respaldo creado"
echo ""

echo "📋 Paso 3: Limpieza completa..."
rm -rf node_modules/
rm -rf .expo/
rm -rf dist/
rm -rf bun.lock
echo "✅ Limpieza completa"
echo ""

echo "📋 Paso 4: Instalando dependencias (esto puede tardar 1-2 minutos)..."
bun install
echo "✅ Dependencias instaladas"
echo ""

echo "📋 Paso 5: Verificando versiones de tRPC..."
TRPC_CLIENT=$(bun pm ls | grep "@trpc/client@" | head -n1)
TRPC_SERVER=$(bun pm ls | grep "@trpc/server@" | head -n1)
REACT_QUERY=$(bun pm ls | grep "@tanstack/react-query@" | head -n1)

echo "   $TRPC_CLIENT"
echo "   $TRPC_SERVER"
echo "   $REACT_QUERY"
echo ""

echo "📋 Paso 6: Verificando PostgreSQL..."
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL activo"
else
    echo "❌ PostgreSQL no está activo"
    sudo systemctl start postgresql
    sleep 2
fi
echo ""

echo "📋 Paso 7: Verificando conectividad DB..."
if sudo -u postgres psql -d reservamesa -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión a DB exitosa"
else
    echo "❌ Error de conexión a DB"
    exit 1
fi
echo ""

echo "📋 Paso 8: Reconstruyendo frontend..."
echo "   (Esto tardará 1-2 minutos, por favor espera...)"
CI=1 EXPO_PUBLIC_API_URL=http://200.234.236.133 bunx expo export --platform web --output-dir dist

if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: Frontend no se construyó correctamente"
    exit 1
fi
echo "✅ Frontend reconstruido"
echo ""

echo "📋 Paso 9: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 5

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend falló al iniciar"
    echo ""
    echo "Últimas 30 líneas del log:"
    tail -n 30 backend.log
    exit 1
fi
echo "✅ Backend iniciado"
echo ""

echo "📋 Paso 10: Verificando endpoints..."
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Health Check: OK (HTTP 200)"
else
    echo "⚠️  API Health Check: HTTP $HTTP_CODE"
    if [ "$HTTP_CODE" = "000" ]; then
        echo "   (El backend aún está iniciando o hay un error)"
    fi
fi
echo ""

echo "📋 Paso 11: Prueba de endpoints tRPC..."
PROVINCES=$(curl -s "http://127.0.0.1:3000/api/trpc/locations.provinces?input=%7B%7D" 2>/dev/null | jq -r '.result.data.json | length' 2>/dev/null || echo "0")
echo "   Provincias en DB: $PROVINCES"
echo ""

echo "✅ ¡DEPLOY COMPLETADO!"
echo "======================"
echo ""
echo "🌐 Accesos:"
echo "   Frontend:    http://200.234.236.133"
echo "   Admin:       http://200.234.236.133/admin"
echo "   Locations:   http://200.234.236.133/admin/locations"
echo "   API:         http://200.234.236.133/api"
echo "   tRPC:        http://200.234.236.133/api/trpc"
echo "   Health:      http://200.234.236.133/api/health"
echo ""
echo "📊 Monitoreo:"
echo "   Ver logs:    tail -f /var/www/reservamesa/backend.log"
echo "   Ver proceso: ps aux | grep bun"
echo "   Detener:     pkill -f 'bun backend/server.ts'"
echo ""
echo "🔍 Si hay problemas:"
echo "   1. Ver logs completos: cat /var/www/reservamesa/backend.log"
echo "   2. Verificar DB: sudo -u postgres psql -d reservamesa -c 'SELECT COUNT(*) FROM provinces;'"
echo "   3. Verificar .env: cat /var/www/reservamesa/.env | grep -E 'DATABASE_URL|EXPO_PUBLIC'"
echo ""
