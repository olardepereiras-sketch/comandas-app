#!/bin/bash

echo "🔧 Arreglando esquema de módulos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas"
else
    echo "❌ Archivo env no encontrado"
    exit 1
fi

echo ""
echo "📋 Paso 2: Ejecutando migración de esquema..."
bun backend/db/fix-modules-schema-complete.ts

if [ $? -ne 0 ]; then
    echo "❌ Error en la migración"
    exit 1
fi

echo ""
echo "📋 Paso 3: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ESQUEMA DE MÓDULOS ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los módulos ahora tienen:"
echo "  • Iconos configurados"
echo "  • Colores asignados"
echo "  • Rutas correctas"
echo "  • Orden de visualización"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
