#!/bin/bash

echo "🔧 ARREGLANDO MÓDULOS DEFINITIVAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f "env" ]; then
    export $(cat env | grep -v '^#' | xargs)
    echo "✅ Variables cargadas desde archivo env"
else
    echo "❌ Error: Archivo env no encontrado"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    exit 1
fi

echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Ejecutando script de arreglo de módulos..."
bun run backend/db/fix-modules-definitivo.ts
if [ $? -eq 0 ]; then
    echo "✅ Módulos arreglados correctamente"
else
    echo "❌ Error arreglando módulos"
    exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
rm -rf .expo
rm -rf dist
bunx expo export -p web --output-dir dist --clear
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    echo "✅ Servidor iniciado correctamente"
else
    echo "❌ Error al iniciar el servidor"
    exit 1
fi

echo ""
echo "📋 Paso 6: Recargando Nginx..."
nginx -s reload
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MÓDULOS ARREGLADOS Y DESPLEGADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los cambios incluyen:"
echo "  • Módulos con IDs correctos en base de datos"
echo "  • restaurant_modules sincronizado con planes"
echo "  • Sistema de habilitación/deshabilitación funcional"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
