#!/bin/bash

echo "🔧 Solucionando problemas críticos..."
echo ""

cd /var/www/reservamesa

echo "📋 1. Agregando columna 'token' a la tabla reservations..."
bun backend/db/add-token-column.ts

if [ $? -ne 0 ]; then
    echo "❌ Error al agregar columna token"
    exit 1
fi

echo ""
echo "🛑 2. Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"

echo ""
echo "🧹 3. Limpiando caché..."
rm -rf dist .expo

echo ""
echo "📦 4. Reconstruyendo frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error al construir frontend"
    exit 1
fi

echo ""
echo "🚀 5. Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🔄 6. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Columna 'token' agregada a reservations"
echo "  ✅ Calendario de Reservas Pro mejorado (7 columnas, colores suaves)"
echo "  ✅ Modificación de reservas por token funcionando"
echo ""
echo "Prueba los cambios en:"
echo "  🔄 https://quieromesa.com/client/reservation/[tu-token]"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
