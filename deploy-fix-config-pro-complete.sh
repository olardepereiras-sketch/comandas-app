#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN COMPLETA DE CONFIG-PRO"
echo "================================================="

echo ""
echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/5: Agregando columnas faltantes a la base de datos..."
bun backend/db/add-missing-restaurant-columns.ts

if [ $? -ne 0 ]; then
  echo "❌ Error al agregar columnas"
  exit 1
fi

echo ""
echo "📋 Paso 3/5: Limpiando caché del frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error al reconstruir el frontend"
  exit 1
fi

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &

sleep 3

if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor reiniciado correctamente"
else
  echo "❌ Error: El servidor no se inició correctamente"
  exit 1
fi

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Intenta guardar los cambios"
echo "   3. Verifica que los switches se queden activados"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
