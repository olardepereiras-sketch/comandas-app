#!/bin/bash

echo "🔧 Desplegando correcciones de persistencia"
echo "================================================"
echo ""

cd /var/www/reservamesa

echo "📦 1. Reconstruyendo el frontend..."
npx expo export --platform web
if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir frontend"
  exit 1
fi
echo "✅ Frontend reconstruido"
echo ""

echo "🔄 2. Reiniciando el servidor..."
pm2 restart reservamesa-backend
echo "✅ Servidor reiniciado"
echo ""

echo "🌐 3. Recargando Nginx..."
sudo nginx -s reload
echo "✅ Nginx recargado"
echo ""

echo "✅ Despliegue completado exitosamente"
echo ""
echo "🔍 Ver logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
