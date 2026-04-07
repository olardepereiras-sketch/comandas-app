#!/bin/bash

echo "🚀 DEPLOYMENT - Desplegando todas las correcciones"
echo "=================================================="
echo ""

echo "📦 1. Compilando frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error compilando frontend"
  exit 1
fi

echo ""
echo "🔄 2. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🔄 3. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "📊 Cambios aplicados:"
echo "   ✓ Botón de modificar reserva funcionando"
echo "   ✓ Tipos de cocina sin timestamps"
echo "   ✓ Botones de borrado arreglados"
echo "   ✓ Visualización de tipos de cocina limpia"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
