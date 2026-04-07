#!/bin/bash

echo "🔧 CORRECCIÓN DEFINITIVA DE SUBIDA DE IMÁGENES"
echo "=============================================="
echo ""

# Problema encontrado: La función placeholder no incluía el símbolo $
# Esto causaba que PostgreSQL no pudiera determinar el tipo de datos
# Error: "could not determine data type of parameter $1"

echo "1️⃣ Creando directorios de uploads..."
mkdir -p dist/uploads/restaurants
mkdir -p dist/uploads/locations
chmod 755 dist/uploads
chmod 755 dist/uploads/restaurants
chmod 755 dist/uploads/locations
echo "✅ Directorios creados con permisos correctos"

echo ""
echo "2️⃣ Verificando corrección en el código..."
if grep -q '\$\${idx}' backend/trpc/routes/restaurants/update/route.ts; then
    echo "✅ Función placeholder corregida (ahora genera \$1, \$2, etc.)"
else
    echo "❌ La función placeholder aún no está corregida"
    exit 1
fi

echo ""
echo "3️⃣ Construyendo el backend..."
cd backend
bun install
bun run build

echo ""
echo "4️⃣ Reiniciando el servidor..."
pm2 restart reservamesa-server || pm2 start ../ecosystem.config.js

echo ""
echo "✅ Corrección aplicada exitosamente"
echo ""
echo "📝 Resumen del problema y solución:"
echo "   Problema: La función placeholder() generaba '1', '2' en lugar de '\$1', '\$2'"
echo "   Solución: Agregado el símbolo \$ en el return de la función"
echo "   Resultado: Los UPDATE SQL ahora funcionan correctamente"
echo ""
echo "Prueba subir una imagen desde https://quieromesa.com/"
