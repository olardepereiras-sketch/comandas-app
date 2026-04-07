#!/bin/bash

echo "🚀 Desplegando correcciones de valoraciones..."

# Detener el servidor
echo "⏸️ Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

# Reiniciar servidor
echo "🔄 Iniciando servidor..."
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &

# Esperar un momento
sleep 5

# Verificar que el servidor esté corriendo
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor reiniciado correctamente"
    echo ""
    echo "📋 Últimas líneas del log:"
    tail -20 backend.log
else
    echo "❌ El servidor no está corriendo"
    echo ""
    echo "📋 Log completo:"
    cat backend.log
fi
