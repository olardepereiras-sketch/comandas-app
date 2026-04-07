#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES CRÍTICAS"
echo "====================================="
echo ""

echo "📋 Este script va a:"
echo "  1. Arreglar esquema de clientes (columnas de valoración)"
echo "  2. Agregar tablas de tipos de cocina"
echo "  3. Reconstruir el frontend"
echo ""

read -p "¿Continuar? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Cancelado"
    exit 1
fi

echo ""
echo "📋 1. Cargando variables de entorno..."
echo "------------------------------------------------------------"
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde .env"
elif [ -f env ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde env"
else
    echo "❌ No se encontró archivo .env"
    exit 1
fi

echo ""
echo "📋 2. Arreglando esquema de clientes..."
echo "------------------------------------------------------------"
bun backend/db/fix-clients-schema.ts
if [ $? -ne 0 ]; then
    echo "❌ Error arreglando esquema de clientes"
    exit 1
fi

echo ""
echo "📋 3. Agregando tablas de tipos de cocina..."
echo "------------------------------------------------------------"
bun backend/db/add-cuisine-types-tables.ts
if [ $? -ne 0 ]; then
    echo "❌ Error agregando tablas de tipos de cocina"
    exit 1
fi

echo ""
echo "📋 4. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
pkill -f "bun.*dev" || true
sleep 2

echo "🔨 Limpiando caché..."
rm -rf .expo
rm -rf node_modules/.cache

echo "🔨 Reconstruyendo..."
bun run build:web &
BUILD_PID=$!

wait $BUILD_PID

if [ $? -eq 0 ]; then
    echo "✅ Frontend reconstruido"
else
    echo "❌ Error reconstruyendo frontend"
    exit 1
fi

echo ""
echo "📋 5. Reiniciando servidor..."
echo "------------------------------------------------------------"
pm2 restart reservamesa || pm2 start ecosystem.config.js

echo ""
echo "✅ =========================================="
echo "✅ DESPLIEGUE COMPLETADO"
echo "✅ =========================================="
echo ""
echo "🔍 Verifica la aplicación en:"
echo "   http://200.234.236.133"
echo ""
