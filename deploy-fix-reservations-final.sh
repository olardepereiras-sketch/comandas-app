#!/bin/bash

echo "🚀 Desplegando correcciones de reservas..."
echo "========================================"

cd /var/www/reservamesa

echo ""
echo "📋 1. Cargando variables de entorno..."
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo "🔄 2. Reconstruyendo frontend..."
rm -rf dist .expo
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error reconstruyendo frontend"
    exit 1
fi

echo ""
echo "✅ Frontend reconstruido exitosamente"

echo ""
echo "🔄 3. Reiniciando backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "✅ Backend reiniciado"

echo ""
echo "🔄 4. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Nginx recargado"

echo ""
echo "=========================================="
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Cambios aplicados:"
echo "  • Las reservas con mesa asignada automáticamente ahora se marcan como 'confirmadas'"
echo "  • El token de confirmación es consistente en toda la aplicación"
echo "  • Los enlaces en WhatsApp ahora funcionan correctamente"
echo "  • El restaurante puede anular reservas desde el panel"
echo ""
echo "🔗 Verificar en:"
echo "  • http://200.234.236.133/restaurant/reservations-pro"
echo "  • http://200.234.236.133/client/reservation/[token]"
echo ""
