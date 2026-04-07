#!/bin/bash

echo "🔄 REINICIANDO SERVIDOR - LIMPIEZA COMPLETA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Matando TODOS los procesos de Bun..."
pkill -9 -f "bun" 2>/dev/null || true
sleep 2

echo "✅ Procesos eliminados"
echo ""

echo "📋 Paso 2: Verificando que el puerto 3000 esté libre..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Puerto 3000 todavía en uso, matando proceso..."
    kill -9 $(lsof -t -i:3000) 2>/dev/null || true
    sleep 2
fi
echo "✅ Puerto 3000 libre"
echo ""

echo "📋 Paso 3: Limpiando logs antiguos..."
> backend.log
echo "✅ Logs limpiados"
echo ""

echo "📋 Paso 4: Iniciando servidor backend..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"
echo ""

echo "📋 Paso 5: Esperando que el servidor inicie (10 segundos)..."
sleep 10

echo ""
echo "📋 Paso 6: Verificando estado del servidor..."
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Servidor corriendo correctamente"
    echo ""
    echo "📋 Últimas líneas del log:"
    tail -n 20 backend.log
else
    echo "❌ El servidor no está corriendo"
    echo ""
    echo "📋 Contenido completo del log:"
    cat backend.log
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SERVIDOR REINICIADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para ver los logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
