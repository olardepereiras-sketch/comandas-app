#!/bin/bash

echo "🚀 DEPLOYMENT - Corrección de modificación de reservas"
echo "=========================================================="
echo ""

echo "📦 1. Compilando frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error compilando frontend"
    exit 1
fi
echo "✅ Frontend compilado"
echo ""

echo "🔄 2. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend reiniciado"
echo ""

echo "🌐 3. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "📊 Cambios aplicados:"
echo "   ✓ Sistema de modificación usa el mismo token"
echo "   ✓ Búsqueda de mesas mejorada (cualquier número de comensales)"
echo "   ✓ Frontend recarga automáticamente tras modificar"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f backend.log"
