#!/bin/bash

echo "🚀 DEPLOYMENT - Desplegando todas las correcciones"
echo "=================================================="

cd /var/www/reservamesa

echo ""
echo "📋 1. Limpiando tipos de cocina..."
bun run backend/db/clean-cuisine-types.ts

echo ""
echo "📦 2. Compilando TypeScript..."
bun run build

echo ""
echo "🔄 3. Reiniciando servidor con PM2..."
pm2 restart reservamesa || pm2 start backend/server.ts --name reservamesa --interpreter bun

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "📊 Estado del servidor:"
pm2 status reservamesa
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs:"
echo "   pm2 logs reservamesa"
echo ""
