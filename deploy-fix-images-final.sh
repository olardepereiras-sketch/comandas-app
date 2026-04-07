#!/bin/bash

echo "🚀 DEPLOYMENT - CORRECCIÓN DEFINITIVA DE IMÁGENES"
echo "================================================"
echo ""

# Este script corrige el problema de subida de imágenes
# Problema: La función placeholder no generaba $1, $2, sino 1, 2
# Esto causaba "could not determine data type of parameter"

echo "📦 Paso 1: Preparando archivos..."
cd /var/www/reservamesa

# Backup del archivo actual
cp backend/trpc/routes/restaurants/update/route.ts backend/trpc/routes/restaurants/update/route.ts.backup.$(date +%s)

echo ""
echo "🔧 Paso 2: Aplicando corrección..."
# Asegurar que placeholder genera $1, $2, etc.
sed -i "s/return \`\${idx}/return \`\$\${idx}/g" backend/trpc/routes/restaurants/update/route.ts

# Verificar la corrección
if grep -q "return \`\$\${idx}" backend/trpc/routes/restaurants/update/route.ts; then
    echo "✅ Función placeholder corregida"
else
    echo "❌ Error al corregir placeholder"
    exit 1
fi

echo ""
echo "📁 Paso 3: Creando directorios de uploads..."
mkdir -p dist/uploads/restaurants
mkdir -p dist/uploads/locations
chmod -R 755 dist/uploads
chown -R www-data:www-data dist/uploads 2>/dev/null || chown -R $(whoami):$(whoami) dist/uploads
echo "✅ Directorios creados con permisos correctos"

echo ""
echo "🔨 Paso 4: Instalando dependencias..."
cd backend
bun install

echo ""
echo "🏗️ Paso 5: Construyendo backend..."
bun run build

echo ""
echo "♻️ Paso 6: Reiniciando servidor..."
cd ..
pm2 restart reservamesa-server
sleep 3
pm2 logs reservamesa-server --lines 20

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo ""
echo "📝 Resumen:"
echo "   ✓ Función placeholder corregida (ahora genera \$1, \$2, \$3...)"
echo "   ✓ Directorios de uploads creados con permisos"
echo "   ✓ Backend reconstruido"
echo "   ✓ Servidor reiniciado"
echo ""
echo "🧪 Para probar:"
echo "   1. Ve a https://quieromesa.com/restaurant"
echo "   2. Sube una imagen de portada en Configuración"
echo "   3. Ve a Gestión de Mesas → Ubicaciones"
echo "   4. Sube una imagen para una ubicación"
echo ""
echo "🔍 Si aún hay problemas, ejecuta:"
echo "   ./diagnose-image-upload.sh"
