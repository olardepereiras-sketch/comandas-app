#!/bin/bash

echo "🔧 ARREGLANDO PROBLEMA DE TOKENS EN PANTALLA BLANCA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /var/www/reservamesa

# Cargar variables de entorno
if [ -f "env" ]; then
    export $(grep -v '^#' env | xargs)
fi

echo "📋 Paso 1: Verificando tokens en la base de datos..."
echo ""

bun backend/db/diagnose-tokens.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Paso 2: Limpiando caché y recompilando frontend..."
echo ""

rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error compilando frontend"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Paso 3: Reiniciando servidor backend..."
echo ""

pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
NEW_PID=$!
echo "✅ Servidor iniciado con PID: $NEW_PID"

echo ""
echo "📋 Paso 4: Esperando que el servidor inicie..."
sleep 5

echo ""
echo "📋 Paso 5: Verificando que el servidor esté corriendo..."
if ps -p $NEW_PID > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ Servidor no está corriendo. Verificando logs..."
    tail -20 backend.log
    exit 1
fi

echo ""
echo "📋 Paso 6: Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PROCESO COMPLETADO"
echo ""
echo "🔍 CAMBIOS REALIZADOS:"
echo "  1. Se agregó mejor manejo de errores en el componente"
echo "  2. Se agregaron logs más detallados para debugging"
echo "  3. Se agregó validación de fecha para evitar crashes"
echo "  4. Frontend recompilado con los cambios"
echo ""
echo "🧪 PRUEBA AHORA:"
echo "  1. Ve a: https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo "  2. Haz una reserva de prueba"
echo "  3. Haz clic en el enlace del token que aparece"
echo "  4. La página debería mostrarse correctamente"
echo ""
echo "🔍 SI SIGUE EN BLANCO:"
echo "  1. Abre la consola del navegador (F12)"
echo "  2. Ve a la pestaña 'Console'"
echo "  3. Busca los logs que comienzan con [RESERVATION SCREEN]"
echo "  4. Copia cualquier error y compártelo"
echo ""
echo "📝 Para ver logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
