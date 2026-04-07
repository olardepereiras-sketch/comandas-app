#!/bin/bash

echo "🔧 ARREGLANDO SHIFT TEMPLATES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
sleep 2
echo "✅ Servidor detenido"
echo ""

echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(grep -v '^#' env | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi
echo ""

echo "📋 Paso 3: Arreglando tabla shift_templates..."
bun backend/db/fix-shift-templates-final.ts
if [ $? -eq 0 ]; then
    echo "✅ Tabla arreglada"
else
    echo "❌ Error arreglando tabla"
    exit 1
fi
echo ""

echo "📋 Paso 4: Limpiando caché..."
rm -rf dist .expo
echo "✅ Caché limpiado"
echo ""

echo "📋 Paso 5: Reconstruyendo frontend..."
bunx expo export -p web > /dev/null 2>&1
echo "✅ Frontend reconstruido"
echo ""

echo "📋 Paso 6: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 5

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error: El servidor no pudo iniciarse"
    echo "Últimas líneas del log:"
    tail -n 20 backend.log
    exit 1
fi
echo ""

echo "📋 Paso 7: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SHIFT TEMPLATES ARREGLADO Y DESPLEGADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ahora puedes crear plantillas de turnos en:"
echo "  https://quieromesa.com/restaurant/schedules"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
