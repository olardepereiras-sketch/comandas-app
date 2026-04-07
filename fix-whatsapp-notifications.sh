#!/bin/bash

echo "🔧 ARREGLANDO TABLA DE NOTIFICACIONES WHATSAPP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Ejecutando script de corrección..."
bun backend/db/fix-whatsapp-table-simple.ts

if [ $? -ne 0 ]; then
    echo "❌ Error ejecutando script"
    exit 1
fi

echo ""
echo "📋 Paso 2: Matando procesos en puerto 3000..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 3: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 4: Verificando servidor..."
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ Error: Servidor no está corriendo"
    echo "Logs:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TABLA ARREGLADA Y SERVIDOR REINICIADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Logs en vivo:"
echo "  tail -f backend.log"
echo ""
