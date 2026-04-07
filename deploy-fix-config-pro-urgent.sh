#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES URGENTES DE CONFIG PRO"
echo "=================================================="

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1/5: Agregando columnas faltantes en base de datos..."
bun backend/db/add-config-pro-columns.ts

echo ""
echo "📋 Paso 2/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true

echo ""
echo "📋 Paso 3/5: Limpiando caché del frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
bunx expo export -p web

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "⏳ Esperando a que el servidor inicie..."
sleep 5

echo ""
echo "📊 Estado del servidor:"
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "  ✅ Servidor ejecutándose"
else
  echo "  ❌ Error: Servidor no está ejecutándose"
  exit 1
fi

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Verifica que todos los switches funcionen correctamente"
echo "   3. Crea una reserva de prueba para verificar las notificaciones"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
