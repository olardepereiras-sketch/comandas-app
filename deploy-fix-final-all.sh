#!/bin/bash

echo "🚀 DESPLEGANDO CORRECCIONES DEFINITIVAS"
echo "============================================"
echo ""

echo "📋 1. Verificando y corrigiendo esquema de base de datos..."
cd /var/www/reservamesa
bun backend/db/verify-and-fix-schema.ts

if [ $? -ne 0 ]; then
    echo "❌ Error al verificar esquema"
    exit 1
fi

echo ""
echo "📦 2. Reconstruyendo el frontend..."
cd /var/www/reservamesa
bunx expo export -p web --output-dir dist

if [ $? -ne 0 ]; then
    echo "❌ Error al construir frontend"
    exit 1
fi

echo ""
echo "🔄 3. Reiniciando el servidor backend..."
pm2 restart reservamesa

if [ $? -ne 0 ]; then
    echo "⚠️ Intentando iniciar con pm2..."
    pm2 start bun --name reservamesa -- backend/server.ts
fi

echo ""
echo "🌐 4. Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica que el servidor esté corriendo: pm2 status"
echo "   2. Revisa los logs: pm2 logs reservamesa"
echo "   3. Prueba la configuración en: http://200.234.236.133/restaurant/config-pro"
echo "   4. Prueba las reservas en: http://200.234.236.133/restaurant/reservations-pro"
echo ""
echo "🔍 Para diagnosticar problemas:"
echo "   chmod +x run-realtime-errors-diagnosis.sh"
echo "   ./run-realtime-errors-diagnosis.sh"
