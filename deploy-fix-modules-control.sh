#!/bin/bash

echo "🔧 ARREGLANDO CONTROL DE MÓDULOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pm2 stop backend || true
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Cargando variables de entorno..."
if [ -f env ]; then
  export $(cat env | grep -v '^#' | xargs)
  echo "✅ Variables cargadas desde archivo env"
else
  echo "❌ Error: archivo env no encontrado"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL no está configurada"
  exit 1
fi
echo "✅ DATABASE_URL configurada"

echo ""
echo "📋 Paso 3: Añadiendo tabla restaurant_modules..."
bun run backend/db/add-restaurant-modules-table.ts
if [ $? -eq 0 ]; then
  echo "✅ Tabla restaurant_modules añadida"
else
  echo "❌ Error añadiendo tabla restaurant_modules"
  exit 1
fi

echo ""
echo "📋 Paso 4: Limpiando caché y reconstruyendo frontend..."
rm -rf node_modules/.cache
rm -rf .expo
bun run build
echo "✅ Frontend reconstruido"

echo ""
echo "📋 Paso 5: Iniciando servidor..."
pm2 restart backend || pm2 start bun --name backend -- run backend/server.ts
echo "✅ Servidor iniciado"

echo ""
echo "📋 Paso 6: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONTROL DE MÓDULOS ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Los cambios incluyen:"
echo "  • Tabla restaurant_modules para control individual"
echo "  • Módulos ahora se pueden activar/desactivar por restaurante"
echo "  • Selector de ubicación al crear mesas"
echo ""
echo "Para ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
