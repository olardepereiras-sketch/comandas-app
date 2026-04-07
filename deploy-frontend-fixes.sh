#!/bin/bash

echo "🚀 Desplegando cambios del frontend..."
echo "===================================="

cd /var/www/reservamesa

echo ""
echo "📋 1. Limpiando build anterior..."
rm -rf dist .expo

echo ""
echo "🔨 2. Reconstruyendo frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error en el build del frontend"
  exit 1
fi

echo ""
echo "🔄 3. Reiniciando backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "🌐 4. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡Despliegue completado!"
echo ""
echo "Los cambios aplicados incluyen:"
echo "  ✓ Confirmaciones de eliminación con mensajes informativos"
echo "  ✓ Campo 'Mensaje día especial' en Reservas Pro"
echo "  ✓ Campo 'Valoración mínima local' en configuración de turnos"
echo ""
echo "Accede a: http://200.234.236.133"
