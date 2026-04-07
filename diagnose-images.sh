#!/bin/bash

echo "🔍 DIAGNÓSTICO DE SISTEMA DE IMÁGENES"
echo "======================================"
echo ""

# Verificar que existe la carpeta de uploads
echo "📁 Verificando carpetas de uploads..."
if [ -d "dist/uploads" ]; then
    echo "✅ Carpeta dist/uploads existe"
    
    if [ -d "dist/uploads/restaurants" ]; then
        echo "✅ Carpeta dist/uploads/restaurants existe"
        RESTAURANT_COUNT=$(find dist/uploads/restaurants -type f 2>/dev/null | wc -l)
        echo "   📸 Imágenes de restaurantes: $RESTAURANT_COUNT"
    else
        echo "⚠️  Carpeta dist/uploads/restaurants NO existe"
        mkdir -p dist/uploads/restaurants
        echo "✅ Carpeta dist/uploads/restaurants creada"
    fi
    
    if [ -d "dist/uploads/locations" ]; then
        echo "✅ Carpeta dist/uploads/locations existe"
        LOCATION_COUNT=$(find dist/uploads/locations -type f 2>/dev/null | wc -l)
        echo "   📸 Imágenes de ubicaciones: $LOCATION_COUNT"
    else
        echo "⚠️  Carpeta dist/uploads/locations NO existe"
        mkdir -p dist/uploads/locations
        echo "✅ Carpeta dist/uploads/locations creada"
    fi
else
    echo "⚠️  Carpeta dist/uploads NO existe"
    mkdir -p dist/uploads/restaurants
    mkdir -p dist/uploads/locations
    echo "✅ Carpetas creadas"
fi

echo ""
echo "📦 Verificando paquete Sharp..."
if bun pm ls | grep -q "sharp"; then
    echo "✅ Sharp está instalado"
    SHARP_VERSION=$(bun pm ls | grep sharp | awk '{print $2}')
    echo "   📦 Versión: $SHARP_VERSION"
else
    echo "❌ Sharp NO está instalado"
    echo "   Instalando Sharp..."
    bun add sharp
fi

echo ""
echo "🔧 Verificando configuración del servidor..."
if grep -q "'/uploads/\*'" backend/server.ts; then
    echo "✅ Servidor configurado para servir /uploads/"
else
    echo "❌ Servidor NO está configurado para servir /uploads/"
fi

echo ""
echo "📋 Últimas imágenes subidas:"
echo ""
echo "Restaurantes:"
find dist/uploads/restaurants -type f 2>/dev/null | tail -5 | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  - $(basename $file) ($SIZE)"
done

echo ""
echo "Ubicaciones:"
find dist/uploads/locations -type f 2>/dev/null | tail -5 | while read file; do
    SIZE=$(du -h "$file" | cut -f1)
    echo "  - $(basename $file) ($SIZE)"
done

echo ""
echo "🌐 URLs de ejemplo para probar:"
echo "https://quieromesa.com/uploads/restaurants/[filename]"
echo "https://quieromesa.com/uploads/locations/[filename]"
echo ""
echo "✅ Diagnóstico completado"
