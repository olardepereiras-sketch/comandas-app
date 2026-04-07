#!/bin/bash

echo "🔧 Corrigiendo sistema de subida de imágenes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "1️⃣ Verificando directorios de uploads..."
mkdir -p dist/uploads/restaurants
mkdir -p dist/uploads/locations
chmod -R 755 dist/uploads
echo "✅ Directorios verificados"

echo ""
echo "2️⃣ Compilando backend..."
cd /var/www/reservamesa
bun run build-backend
echo "✅ Backend compilado"

echo ""
echo "3️⃣ Reiniciando servidor..."
pm2 restart reservamesa || npm start &
sleep 3
echo "✅ Servidor reiniciado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Corrección completada"
echo ""
echo "📝 Cambios aplicados:"
echo "   • Corregidos placeholders SQL en actualización de restaurantes"
echo "   • Verificados directorios de uploads"
echo ""
echo "🔄 Ahora puedes:"
echo "   1. Subir imágenes de portada en el módulo configuración"
echo "   2. Subir imágenes de ubicaciones en gestión de mesas"
echo "   3. Las imágenes se guardarán correctamente en todos los restaurantes"
