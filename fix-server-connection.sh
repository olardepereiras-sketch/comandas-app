#!/bin/bash

echo "🔧 SOLUCIONANDO CONEXIÓN DEL SERVIDOR"
echo "======================================"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Matando procesos existentes..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
pkill -f "bun.*server.ts" 2>/dev/null || true
sleep 2

echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 2: Reinstalando dependencias..."
bun install --force

echo "✅ Dependencias reinstaladas"

echo ""
echo "📋 Paso 3: Verificando DATABASE_URL..."
if grep -q "DATABASE_URL=" .env; then
    echo "✅ DATABASE_URL encontrada en .env"
else
    echo "❌ DATABASE_URL no encontrada en .env"
    exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando logs..."
> backend.log

echo ""
echo "📋 Paso 5: Iniciando servidor..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "📋 Paso 6: Esperando inicio del servidor (15 segundos)..."
sleep 15

echo ""
echo "📋 Paso 7: Verificando estado..."
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ ¡Servidor corriendo correctamente!"
    echo ""
    echo "📋 Últimas líneas del log:"
    tail -20 backend.log
    echo ""
    echo "✅ SOLUCIÓN COMPLETADA"
    echo "🌐 El sistema debería estar conectado ahora"
else
    echo "❌ El servidor no está corriendo"
    echo ""
    echo "📋 Log completo:"
    cat backend.log
    exit 1
fi
