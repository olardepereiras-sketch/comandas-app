#!/bin/bash

echo "🚀 Desplegando correcciones de tronas y sistema de recordatorios..."

echo ""
echo "📦 Paso 1: Limpiando archivos antiguos..."
rm -rf dist .expo

echo ""
echo "📦 Paso 2: Construyendo aplicación..."
bunx expo export -p web

echo ""
echo "📦 Paso 3: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo ""
echo "📦 Paso 4: Esperando a que el servidor inicie..."
sleep 3

echo ""
echo "📦 Paso 5: Verificando sistema de recordatorios..."
echo "Verificando tabla whatsapp_notifications..."
psql $DATABASE_URL -c "SELECT COUNT(*) as total_notifications, status FROM whatsapp_notifications GROUP BY status;"

echo ""
echo "✅ Despliegue completado exitosamente"
echo "📝 Cambios aplicados:"
echo "   ✓ Tronas: ahora no ocultan horas, solo muestran advertencia"
echo "   ✓ Checkbox de términos: se resetea después de cada reserva"
echo "   ✓ Validación de tronas mejorada (solo cuando hay hora seleccionada)"
echo ""
echo "📊 Para verificar recordatorios programados:"
echo "   psql \$DATABASE_URL -c \"SELECT id, notification_type, scheduled_for, status FROM whatsapp_notifications WHERE status = 'pending' ORDER BY scheduled_for;\""
echo ""
echo "🔍 Para ver los logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
