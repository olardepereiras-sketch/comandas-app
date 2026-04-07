#!/bin/bash

echo "🕐 CREANDO HORAS Y DESPLEGANDO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi

echo ""
echo "📋 Paso 3: Creando horas..."
bun backend/db/create-time-slots.ts

if [ $? -ne 0 ]; then
    echo "❌ Error creando horas"
    exit 1
fi

echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado"
else
    echo "❌ Error: El servidor no pudo iniciarse"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "📋 Paso 6: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🕐 25 horas creadas (12:00 - 00:00)"
echo "📱 Interfaz actualizada"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
