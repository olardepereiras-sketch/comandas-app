#!/bin/bash

echo "🔧 ARREGLANDO MÓDULOS HABILITADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"
echo ""

echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Error: archivo env no encontrado"
    exit 1
fi
echo ""

echo "📋 Paso 3: Ejecutando script de arreglo..."
cd /var/www/reservamesa
bun run backend/db/fix-modules-enabled.ts
if [ $? -eq 0 ]; then
    echo "✅ Módulos arreglados"
else
    echo "❌ Error arreglando módulos"
    exit 1
fi
echo ""

echo "📋 Paso 4: Iniciando servidor..."
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 5

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error: El servidor no pudo iniciarse"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi
echo ""

echo "📋 Paso 5: Recargando Nginx..."
nginx -s reload
echo "✅ Nginx recargado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MÓDULOS ARREGLADOS Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifica en https://quieromesa.com/restaurant"
echo "que los módulos estén habilitados correctamente."
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
