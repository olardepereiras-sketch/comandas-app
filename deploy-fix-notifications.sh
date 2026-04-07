#!/bin/bash

echo "🔧 DESPLEGANDO MEJORAS DE NOTIFICACIONES"
echo "========================================"
echo ""

echo "📋 Paso 1/5: Agregando columna enable_email_notifications a la base de datos..."
ssh root@200.234.236.133 << 'ENDSSH'
cd /var/www/reservamesa
psql -U reservamesa_user -d reservamesa_db -c "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false;"
echo "✅ Columna agregada exitosamente"
ENDSSH

echo ""
echo "📋 Paso 2/5: Subiendo archivos al servidor..."
scp backend/services/email.ts root@200.234.236.133:/var/www/reservamesa/backend/services/
scp backend/trpc/routes/restaurants/update/route.ts root@200.234.236.133:/var/www/reservamesa/backend/trpc/routes/restaurants/
scp backend/trpc/routes/reservations/create/route.ts root@200.234.236.133:/var/www/reservamesa/backend/trpc/routes/reservations/
scp app/restaurant/config-pro.tsx root@200.234.236.133:/var/www/reservamesa/app/restaurant/
scp types/index.ts root@200.234.236.133:/var/www/reservamesa/types/

echo ""
echo "📋 Paso 3/5: Deteniendo servidor..."
ssh root@200.234.236.133 'pkill -f "bun.*backend/server.ts"'

echo ""
echo "📋 Paso 4/5: Reconstruyendo frontend..."
ssh root@200.234.236.133 << 'ENDSSH'
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web
ENDSSH

echo ""
echo "📋 Paso 5/5: Reiniciando servidor..."
ssh root@200.234.236.133 << 'ENDSSH'
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
sudo systemctl reload nginx
ENDSSH

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Cambios aplicados:"
echo "   1. ✅ WhatsApp notificaciones simples a teléfonos de contacto"
echo "      - Formato: Día - Hora - Nombre - Teléfono - Ubicación - Mesa - Comensales"
echo "   2. ✅ Switch para activar/desactivar notificaciones por email"
echo "   3. ✅ Eliminada opción de Twilio (solo WhatsApp Web)"
echo "   4. ✅ Texto actualizado: 'Texto adicional que se enviará al cliente en el WhatsApp de confirma su reserva'"
echo ""
echo "🔍 Monitorear logs:"
echo "   ssh root@200.234.236.133 'tail -f /var/www/reservamesa/backend.log'"
