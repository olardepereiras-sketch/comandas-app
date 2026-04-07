#!/bin/bash

echo "🚀 DEPLOYMENT COMPLETO - Corrección definitiva"
echo "================================================"
echo ""

echo "📋 1. Deteniendo procesos existentes..."
pkill -f "bun.*backend/server.ts" || true
echo "✅ Procesos detenidos"
echo ""

echo "📋 2. Limpiando compilación anterior..."
rm -rf dist .expo
echo "✅ Limpieza completada"
echo ""

echo "📋 3. Compilando frontend..."
bunx expo export -p web
if [ $? -ne 0 ]; then
  echo "❌ Error al compilar frontend"
  exit 1
fi
echo "✅ Frontend compilado"
echo ""

echo "📋 4. Iniciando servidor backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Backend iniciado"
echo ""

echo "📋 5. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f backend.log"
echo ""
