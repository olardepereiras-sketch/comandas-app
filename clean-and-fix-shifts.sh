#!/bin/bash

echo "🧹 LIMPIEZA Y CORRECCIÓN DE TURNOS"
echo "===================================="
echo ""
echo "Este script:"
echo "  1. Limpia day_exceptions corruptos de la base de datos"
echo "  2. Reconstruye el frontend con correcciones"
echo ""
read -p "¿Continuar? (s/n): " confirm

if [ "$confirm" != "s" ]; then
  echo "❌ Cancelado"
  exit 1
fi

echo ""
echo "📋 1. Limpiando excepciones corruptas..."
echo "------------------------------------------------------------"
source .env
bun backend/db/clean-corrupted-exceptions.ts

if [ $? -ne 0 ]; then
  echo "❌ Error en la limpieza"
  exit 1
fi

echo ""
echo "📦 2. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error en el build"
  exit 1
fi

echo ""
echo "🔄 3. Reiniciando servidor..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🔄 4. Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo "========================"
echo ""
echo "Los day_exceptions corruptos han sido eliminados."
echo "Ahora puedes configurar nuevos días desde el calendario."
