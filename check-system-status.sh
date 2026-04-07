#!/bin/bash

echo "🔍 VERIFICACIÓN DEL ESTADO DEL SISTEMA"
echo "======================================"

cd /var/www/reservamesa

echo ""
echo "1️⃣ Estado del servidor:"
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "   ✅ Servidor corriendo"
    PID=$(pgrep -f "bun.*backend/server.ts")
    echo "   📋 PID: $PID"
else
    echo "   ❌ Servidor NO corriendo"
fi

echo ""
echo "2️⃣ Puerto 3000:"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "   ✅ Puerto 3000 en uso"
    lsof -i :3000
else
    echo "   ❌ Puerto 3000 libre (el servidor debería usarlo)"
fi

echo ""
echo "3️⃣ Variables de entorno (.env):"
if [ -f .env ]; then
    echo "   ✅ Archivo .env existe"
    if grep -q "DATABASE_URL=" .env; then
        echo "   ✅ DATABASE_URL configurada"
    else
        echo "   ❌ DATABASE_URL NO configurada"
    fi
    if grep -q "EXPO_PUBLIC_RORK_API_BASE_URL=" .env; then
        echo "   ✅ EXPO_PUBLIC_RORK_API_BASE_URL configurada"
    else
        echo "   ❌ EXPO_PUBLIC_RORK_API_BASE_URL NO configurada"
    fi
else
    echo "   ❌ Archivo .env NO existe"
fi

echo ""
echo "4️⃣ Últimas líneas del log del servidor:"
if [ -f backend.log ]; then
    tail -30 backend.log
else
    echo "   ⚠️ No hay archivo backend.log"
fi

echo ""
echo "5️⃣ Test de conexión a PostgreSQL:"
cd backend
bun -e "
import { readFileSync } from 'fs';
const envContent = readFileSync('../.env', 'utf-8');
const dbUrl = envContent.split('\\n').find(l => l.startsWith('DATABASE_URL='))?.split('=')[1];
console.log('DATABASE_URL:', dbUrl ? '✅ Configurada' : '❌ No encontrada');
" 2>&1 || echo "❌ Error al verificar"

echo ""
echo "======================================"
echo "VERIFICACIÓN COMPLETADA"
