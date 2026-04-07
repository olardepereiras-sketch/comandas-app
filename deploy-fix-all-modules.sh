#!/bin/bash

echo "🚀 Desplegando correcciones completas del sistema..."
echo "========================================"

cd /var/www/reservamesa

export $(cat .env | grep -v '^#' | xargs)
echo "✅ Variables de entorno cargadas"

echo ""
echo "📋 1. Poblando módulos reales..."
echo "------------------------------------------------------------"
bun backend/db/populate-real-modules.ts
if [ $? -ne 0 ]; then
  echo "❌ Error poblando módulos"
  exit 1
fi
echo "✅ Módulos poblados"

echo ""
echo "🔨 2. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error en build del frontend"
  exit 1
fi
echo "✅ Frontend construido"

echo ""
echo "🔄 3. Reiniciando servidor..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "🌐 4. Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "✅ Despliegue completado!"
echo "========================================"
echo "🔍 Verifica el estado en http://200.234.236.133"
