#!/bin/bash

echo "🚀 Desplegando solución completa de grupos de mesas..."

echo ""
echo "📦 Paso 1: Ejecutando migración de base de datos..."
bun backend/db/fix-table-groups-location.ts
if [ $? -ne 0 ]; then
    echo "❌ Error en migración"
    exit 1
fi

echo ""
echo "📦 Paso 2: Limpiando archivos antiguos..."
rm -rf dist .expo

echo ""
echo "📦 Paso 3: Construyendo aplicación..."
bunx expo export -p web

echo ""
echo "📦 Paso 4: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "📦 Paso 5: Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo "📝 Verificar logs: tail -f /var/www/reservamesa/backend.log"
