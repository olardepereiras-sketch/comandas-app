#!/bin/bash

echo "🚀 DEPLOYMENT - Arreglando borrado y modificación de reservas"
echo "=============================================================="

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
echo "🌐 3. Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================"
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Cambios aplicados:"
echo "   ✅ Validaciones en cascada para borrado de tipos de cocina"
echo "   ✅ Validación para borrado de provincias (requiere sin poblaciones)"
echo "   ✅ Validación para borrado de poblaciones (requiere sin restaurantes)"
echo "   ✅ Nueva pantalla completa de modificación de reservas"
echo "   ✅ Sistema de confirmación y navegación mejorado"
echo ""
