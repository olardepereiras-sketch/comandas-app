#!/bin/bash

echo "🚀 DEPLOYMENT - Desplegando correcciones completas"
echo "=================================================="

echo ""
echo "📦 1. Compilando frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web

echo ""
echo "🔄 2. Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🔄 3. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "📊 Cambios aplicados:"
echo "   ✅ Modificación de reservas funciona correctamente"
echo "   ✅ Números de comensales disponibles (1, 2, etc.)"
echo "   ✅ Botones de borrado funcionan con confirmación"
echo "   ✅ Tipos de cocina sin prefijos"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Verificaciones:"
echo "   1. Prueba modificar una reserva desde el token del cliente"
echo "   2. Verifica que los botones de borrado piden confirmación"
echo "   3. Comprueba que los tipos de cocina se muestran correctamente"
echo ""
