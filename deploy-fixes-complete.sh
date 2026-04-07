#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES COMPLETAS"
echo "======================================"

echo ""
echo "📋 Cambios a desplegar:"
echo "  ✓ Tipos de cocina sin prefijo 'cuisine-'"
echo "  ✓ Filtrado mejorado de tipos de cocina"
echo "  ✓ Botones de borrar corregidos"
echo "  ✓ Botón de modificar reserva añadido"
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
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend reiniciado"
echo ""

echo "🔧 3. Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "✅ DESPLIEGUE COMPLETADO"
echo "======================="
echo ""
echo "🔗 URLs:"
echo "   - Frontend: https://quieromesa.com"
echo "   - API: https://quieromesa.com/api"
echo ""
echo "📝 Para ver logs del backend:"
echo "   tail -f backend.log"
echo ""
echo "🎯 Cambios aplicados:"
echo "   1. Los tipos de cocina ahora se crean sin el prefijo 'cuisine-'"
echo "   2. El buscador filtra correctamente por tipos de cocina"
echo "   3. Los botones de borrar funcionan correctamente"
echo "   4. La página del cliente tiene un botón 'Modificar Reserva'"
echo ""
