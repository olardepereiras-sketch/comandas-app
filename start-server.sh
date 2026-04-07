#!/bin/bash

# Script de inicio del servidor ReservaMesa
# Ejecutar: ./start-server.sh

cd "$(dirname "$0")"

echo "🚀 Iniciando ReservaMesa..."
echo ""

# Verificar .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

# Verificar que PostgreSQL esté corriendo
if ! systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL no está corriendo"
    echo "Ejecuta: sudo systemctl start postgresql"
    exit 1
fi

# Detener proceso anterior
echo "🛑 Deteniendo servidor anterior..."
pkill -f 'bun.*server.ts' 2>/dev/null || true
sleep 1

# Iniciar servidor
echo "✅ Iniciando servidor..."
nohup bun --env-file .env backend/server.ts > /var/log/reservamesa.log 2>&1 &

sleep 2

# Verificar que esté corriendo
if ps aux | grep 'bun.*server.ts' | grep -v grep > /dev/null; then
    echo ""
    echo "======================================"
    echo "   ✅ SERVIDOR INICIADO"
    echo "======================================"
    echo ""
    echo "🌐 Frontend: http://200.234.236.133"
    echo "📡 API: http://200.234.236.133/api"
    echo "🔧 tRPC: http://200.234.236.133/api/trpc"
    echo "🏥 Health: http://200.234.236.133/api/health"
    echo ""
    echo "📋 Ver logs:"
    echo "  tail -f /var/log/reservamesa.log"
    echo ""
else
    echo ""
    echo "❌ Error al iniciar servidor"
    echo "Ver logs: tail /var/log/reservamesa.log"
    exit 1
fi
