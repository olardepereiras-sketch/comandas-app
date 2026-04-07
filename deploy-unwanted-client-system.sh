#!/bin/bash

echo "🚀 Desplegando sistema de cliente no deseado..."

VPS_USER="root"
VPS_HOST="200.234.236.133"
VPS_PATH="/var/www/reservamesa"

echo "📦 Preparando archivos locales..."

echo "📤 Subiendo archivos al VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  backend/db/add-restaurant-blocks.ts \
  backend/db/add-unwanted-client-column.ts \
  backend/trpc/routes/clients/toggle-unwanted/ \
  backend/trpc/routes/clients/get-client-details/ \
  backend/trpc/routes/reservations/rate-client/route.ts \
  backend/trpc/routes/reservations/available-slots/route.ts \
  backend/trpc/routes/restaurants/list-ratings/route.ts \
  backend/trpc/app-router.ts \
  ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/

echo "🔧 Ejecutando migraciones en el VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /var/www/reservamesa

echo "📋 Ejecutando migración de restaurant_blocks..."
NODE_ENV=production bun run backend/db/add-restaurant-blocks.ts

echo "📋 Ejecutando migración de is_unwanted_client..."
NODE_ENV=production bun run backend/db/add-unwanted-client-column.ts

echo "🔄 Reiniciando servidor..."
pm2 restart reservamesa-server

echo "✅ Sistema desplegado correctamente"
ENDSSH

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "📝 Cambios realizados:"
echo "  - Sistema de bloqueo por restaurante (cliente no deseado)"
echo "  - Campo restaurant_blocks en tabla clients"
echo "  - Campo is_unwanted_client en tabla client_ratings"
echo "  - Nuevos endpoints: toggleUnwanted, getClientDetails"
echo "  - Actualizado rate-client para soportar isUnwantedClient"
echo "  - Actualizado available-slots para verificar bloqueos"
echo "  - Actualizado list-ratings para mostrar estado de bloqueo"
echo ""
