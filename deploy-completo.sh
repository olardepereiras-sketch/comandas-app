#!/bin/bash

set -e

echo "======================================"
echo "🚀 DEPLOY COMPLETO - ReservaMesa"
echo "======================================"

echo ""
echo "📋 Paso 1: Verificar variables de entorno..."
if [ ! -f .env ]; then
    echo "❌ Error: archivo .env no encontrado"
    exit 1
fi

grep -q "DATABASE_URL=postgresql://" .env || { echo "❌ DATABASE_URL no configurada"; exit 1; }
grep -q "EXPO_PUBLIC_RORK_API_BASE_URL=http://200.234.236.133" .env || { echo "❌ EXPO_PUBLIC_RORK_API_BASE_URL no configurada"; exit 1; }

echo "✅ Variables de entorno correctas"

echo ""
echo "📋 Paso 2: Verificar PostgreSQL..."
sudo -u postgres psql -d reservamesa_db -c "SELECT COUNT(*) FROM provinces;" || { echo "❌ PostgreSQL no accesible"; exit 1; }
echo "✅ PostgreSQL funcionando"

echo ""
echo "📋 Paso 3: Limpiar procesos anteriores..."
pkill -f "bun backend/server.ts" || true
pm2 delete reservamesa 2>/dev/null || true
echo "✅ Procesos limpiados"

echo ""
echo "📋 Paso 4: Limpiar caché del frontend..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf dist
echo "✅ Caché limpiada"

echo ""
echo "📋 Paso 5: Reconstruir frontend..."
bun run export
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 6: Iniciar servidor con PM2..."
pm2 start bun --name reservamesa -- --env-file .env backend/server.ts
pm2 save
echo "✅ Servidor iniciado"

echo ""
echo "======================================"
echo "✅ DEPLOY COMPLETADO"
echo "======================================"
echo ""
echo "🌐 Frontend: http://200.234.236.133"
echo "🔧 Backend: http://200.234.236.133/api"
echo "📊 Logs: pm2 logs reservamesa"
echo "📊 Estado: pm2 status"
echo ""
