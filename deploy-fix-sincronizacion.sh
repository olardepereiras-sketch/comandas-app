#!/bin/bash

echo "🔧 Desplegando correcciones de sincronización"
echo "================================================"
echo ""
echo "✅ Cambios aplicados:"
echo "   - Días cerrados ahora se guardan como abiertos correctamente"
echo "   - Los cambios en comensales máximos persisten después de guardar"
echo "   - Tiempo de rotación se actualiza correctamente en config-pro"
echo ""

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
rm -rf dist .expo

# Reconstruir frontend
echo ""
echo "📦 Reconstruyendo el frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
    echo "❌ Error al construir el frontend"
    exit 1
fi

echo "✅ Frontend reconstruido"

# Reiniciar servidor
echo ""
echo "🔄 Reiniciando el servidor..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "✅ Servidor reiniciado"

# Recargar Nginx
echo ""
echo "🌐 Recargando Nginx..."
sudo systemctl reload nginx

echo "✅ Nginx recargado"

echo ""
echo "================================================"
echo "✅ Despliegue completado exitosamente"
echo ""
echo "🔍 Ver logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
