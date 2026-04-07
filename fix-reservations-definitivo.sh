#!/bin/bash

echo "🔧 SOLUCIÓN DEFINITIVA - Reparando sistema de reservas"
echo "========================================================"

cd /var/www/reservamesa || exit 1

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pm2 stop backend

echo ""
echo "📋 Paso 2: Reparando tabla de reservations..."
bun run backend/db/fix-reservations-table-complete.ts

if [ $? -ne 0 ]; then
    echo "❌ Error reparando la tabla"
    echo "🔄 Intentando con Node.js..."
    node --loader tsx backend/db/fix-reservations-table-complete.ts
fi

echo ""
echo "📋 Paso 3: Instalando dependencias..."
bun install

echo ""
echo "📋 Paso 4: Reiniciando servidor..."
pm2 restart backend || pm2 start ecosystem.config.js

echo ""
echo "📋 Paso 5: Mostrando logs..."
sleep 3
pm2 logs backend --lines 50

echo ""
echo "✅ Reparación completada"
echo ""
echo "🧪 Prueba crear una reserva desde:"
echo "   https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo ""
