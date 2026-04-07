#!/bin/bash

echo "🧹 Limpiando caché del frontend..."

rm -rf .expo
rm -rf node_modules/.cache
rm -rf dist

echo "🔨 Reconstruyendo el frontend..."

bun run export

echo "✅ Frontend reconstruido correctamente"
echo "📦 Los archivos están en: dist/"
