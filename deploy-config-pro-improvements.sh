#!/bin/bash

echo "🚀 DESPLEGANDO MEJORAS DE CONFIGURACIÓN PRO"
echo "==========================================="
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1/5: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/5: Aplicando migración de base de datos..."
bun backend/db/add-reminders-config.ts

if [ $? -ne 0 ]; then
  echo "❌ Error en la migración de base de datos"
  exit 1
fi

echo ""
echo "📋 Paso 3/5: Limpiando caché..."
rm -rf dist .expo node_modules/.cache

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

echo ""
echo "🔄 Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Nuevas funcionalidades disponibles:"
echo "   1. ✅ Notificaciones por Email configurables"
echo "   2. ✅ Recordatorios de WhatsApp (2 niveles)"
echo "   3. ✅ Tiempo de modificación/cancelación configurable"
echo "   4. ✅ Mensaje de confirmación dinámico con tiempo personalizado"
echo "   5. ✅ Mensaje simplificado a teléfonos de contacto"
echo ""
echo "🌐 Accede a: https://quieromesa.com/restaurant/config-pro"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
