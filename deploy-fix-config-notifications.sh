#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES DE CONFIGURACIÓN Y NOTIFICACIONES"
echo "=============================================================="

echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 2/4: Limpiando caché del frontend..."
cd /var/www/reservamesa
rm -rf dist .expo

echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
bunx expo export -p web
if [ $? -ne 0 ]; then
    echo "❌ Error al reconstruir el frontend"
    exit 1
fi

echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Correcciones aplicadas:"
echo "   ✅ Config Pro ahora refresca correctamente después de guardar"
echo "   ✅ Notificaciones WhatsApp ahora muestran la mesa asignada"
echo "   ✅ Botón de contactar abre WhatsApp sin plantilla"
echo ""
echo "🔍 Verificar que todo funciona:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa notificaciones por email y recordatorios"
echo "   3. Guarda y verifica que se mantienen activados"
echo "   4. Crea una reserva y verifica que la notificación muestra la mesa"
echo ""
echo "📊 Ver logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
