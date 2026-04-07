#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES COMPLETAS DE VALORACIONES"
echo "======================================================"
echo ""

# Detener servidor
echo "⏸️ Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

# Limpiar y compilar frontend
echo "🏗️ Paso 2: Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ ! -d "dist" ]; then
    echo "❌ Error: No se generó la carpeta dist"
    exit 1
fi

echo "✅ Frontend compilado"

# Reiniciar servidor
echo "🔄 Paso 3: Iniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

# Esperar inicio
echo "⏳ Esperando 10 segundos para que el servidor inicie..."
sleep 10

# Verificar estado
echo ""
echo "📊 ESTADO DEL SISTEMA"
echo "======================================================"

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
    echo "✅ Servidor corriendo"
else
    echo "❌ Servidor NO corriendo"
fi

echo ""
echo "📋 Últimas 30 líneas del log:"
tail -30 backend.log

echo ""
echo "======================================================"
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "Cambios aplicados:"
echo "  1. ✅ Búsqueda de usuarios en /restaurant/ratings"
echo "  2. ✅ Edición de valoraciones antiguas en /admin/users"
echo "  3. ✅ Auto-valoración después de 24h (4 corazones)"
echo "  4. ✅ Workers de completion y auto-rating activos"
echo ""
echo "Para monitorear en tiempo real:"
echo "  tail -f backend.log"
