#!/bin/bash

echo "🚀 Desplegando sistema de módulos dinámicos..."
echo "========================================"

cd /var/www/reservamesa
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "📋 1. Creando tabla de módulos..."
echo "------------------------------------------------------------"
bun backend/db/add-modules-table.ts

if [ $? -ne 0 ]; then
  echo "❌ Error creando tabla de módulos"
  exit 1
fi

echo ""
echo "✅ Tabla de módulos creada"

echo ""
echo "🔨 2. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error en build del frontend"
  exit 1
fi

echo "✅ Frontend reconstruido"

echo ""
echo "🔄 3. Reiniciando servidor backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "✅ Backend reiniciado"

echo ""
echo "🌐 4. Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "🎉 Sistema de módulos dinámicos desplegado correctamente"
echo ""
echo "Funcionalidades añadidas:"
echo "  ✓ Crear nuevos módulos desde /admin/modules"
echo "  ✓ Editar módulos existentes"
echo "  ✓ Eliminar módulos"
echo "  ✓ Asignar módulos a planes de suscripción"
echo "  ✓ Los restaurantes verán solo los módulos de su plan"
