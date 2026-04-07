#!/bin/bash

echo "🔍 DIAGNÓSTICO DE SUBIDA DE IMÁGENES"
echo "===================================="
echo ""

# Verificar directorio de uploads
echo "📁 Verificando directorios de uploads..."
if [ -d "dist/uploads/restaurants" ]; then
    echo "✅ dist/uploads/restaurants existe"
    echo "   Archivos:"
    ls -lh dist/uploads/restaurants/ | tail -10
else
    echo "❌ dist/uploads/restaurants NO existe"
fi

echo ""
if [ -d "dist/uploads/locations" ]; then
    echo "✅ dist/uploads/locations existe"
    echo "   Archivos:"
    ls -lh dist/uploads/locations/ | tail -10
else
    echo "❌ dist/uploads/locations NO existe"
fi

# Verificar permisos
echo ""
echo "🔒 Verificando permisos..."
if [ -d "dist/uploads" ]; then
    ls -ld dist/uploads
    ls -ld dist/uploads/restaurants 2>/dev/null || echo "   ❌ dist/uploads/restaurants no existe"
    ls -ld dist/uploads/locations 2>/dev/null || echo "   ❌ dist/uploads/locations no existe"
fi

# Verificar columnas de la base de datos
echo ""
echo "🗄️ Verificando columnas de restaurantes en la base de datos..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d restaurants" | grep -E "(profile_image_url|image_url)"

echo ""
echo "🗄️ Verificando columnas de ubicaciones en la base de datos..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\d table_locations" | grep "image_url"

# Verificar datos actuales
echo ""
echo "📊 Verificando imágenes en restaurantes..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT id, name, profile_image_url, image_url FROM restaurants LIMIT 5;"

echo ""
echo "📊 Verificando imágenes en ubicaciones..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT id, name, image_url FROM table_locations LIMIT 10;"

# Test de escritura
echo ""
echo "✏️ Test de escritura en directorio uploads..."
touch dist/uploads/test-write-$(date +%s).txt 2>/dev/null && echo "✅ Puede escribir en dist/uploads" || echo "❌ No puede escribir en dist/uploads"

echo ""
echo "🔍 Análisis del código de actualización..."
echo "   Buscando función placeholder en update/route.ts..."
grep -n "function placeholder" backend/trpc/routes/restaurants/update/route.ts

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "Si las imágenes no se guardan, verifica:"
echo "1. Los placeholders SQL deben tener formato \$1, \$2, etc."
echo "2. Los directorios deben tener permisos de escritura"
echo "3. Las columnas image_url deben ser tipo TEXT o VARCHAR"
