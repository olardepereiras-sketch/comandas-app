#!/bin/bash

echo "🚀 DEPLOYMENT DEFINITIVO - Solución Completa"
echo "=============================================="

echo ""
echo "📋 1. Limpiando completamente builds anteriores..."
rm -rf dist
rm -rf .expo
rm -rf node_modules/.cache

echo ""
echo "📦 2. Compilando frontend desde cero..."
bunx expo export -p web --clear

if [ $? -ne 0 ]; then
  echo "❌ Error en la compilación del frontend"
  exit 1
fi

echo ""
echo "🔄 3. Deteniendo TODOS los procesos del backend..."
pkill -9 -f "bun.*backend/server.ts" || true
sleep 2

echo ""
echo "🚀 4. Iniciando servidor backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado con PID: $BACKEND_PID"
sleep 3

echo ""
echo "🔄 5. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🧪 CAMBIOS APLICADOS:"
echo "   1. ✅ Botones de borrado funcionan con confirmación"
echo "   2. ✅ Provincias: valida ciudades antes de borrar"
echo "   3. ✅ Ciudades: valida restaurantes antes de borrar"
echo "   4. ✅ Tipos de cocina: se borran con advertencia"
echo "   5. ✅ Modificación de reservas: anula antigua y crea nueva"
echo "   6. ✅ Notifica al restaurante tras modificación"
echo ""
echo "⚠️  IMPORTANTE: Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)"
echo ""
