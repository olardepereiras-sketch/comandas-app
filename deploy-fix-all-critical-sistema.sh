#!/bin/bash

echo "🔧 DESPLIEGUE COMPLETO - ARREGLOS CRÍTICOS DEL SISTEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

set -e

echo ""
echo "📋 Paso 1: Verificando conexión a PostgreSQL..."
if ! sudo -u postgres psql -d reservamesa_db -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ PostgreSQL no está disponible. Iniciando..."
    sudo systemctl start postgresql
    sleep 3
fi
echo "✅ PostgreSQL conectado"

echo ""
echo "📋 Paso 2: Arreglando tabla whatsapp_notifications..."
sudo -u postgres psql -d reservamesa_db <<EOF
DO \$\$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_notifications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE whatsapp_notifications DROP COLUMN updated_at;
        RAISE NOTICE 'Columna updated_at eliminada';
    ELSE
        RAISE NOTICE 'Columna updated_at ya no existe';
    END IF;
END \$\$;
EOF
echo "✅ Tabla whatsapp_notifications arreglada"

echo ""
echo "📋 Paso 3: Verificando estructura de reservas..."
sudo -u postgres psql -d reservamesa_db -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND column_name IN ('confirmation_token', 'token', 'confirmation_token2')
ORDER BY column_name;
"

echo ""
echo "📋 Paso 4: Limpiando caché y compilando frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
echo "✅ Caché limpiado"

echo ""
echo "📋 Paso 5: Compilando frontend actualizado..."
bunx expo export -p web
echo "✅ Frontend compilado"

echo ""
echo "📋 Paso 6: Deteniendo servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 7: Iniciando servidor backend actualizado..."
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "📋 Paso 8: Esperando que el servidor inicie (10 segundos)..."
sleep 10

echo ""
echo "📋 Paso 9: Verificando que el servidor esté corriendo..."
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Servidor corriendo correctamente"
else
    echo "❌ Error: El servidor no está corriendo"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "📋 Paso 10: Recargando Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "📋 Paso 11: Verificando logs del servidor..."
echo "Últimas 30 líneas:"
tail -30 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Verificaciones recomendadas:"
echo "  1. Probar tokens de reserva:"
echo "     - Desde /client/restaurant/[slug]"
echo "     - Verificar que muestra información correcta"
echo "     - Probar botones de modificar y cancelar"
echo ""
echo "  2. Verificar dashboard de admin:"
echo "     - https://quieromesa.com/admin"
echo "     - Ver nuevas métricas: No Show, Reservas Mes, Disco, CPU/RAM"
echo ""
echo "  3. Probar sistema de recordatorios:"
echo "     - Crear reserva y verificar que se programan los recordatorios"
echo "     - Sin errores en los logs"
echo ""
echo "📊 Para ver logs en tiempo real:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔍 Para verificar tokens en la base de datos:"
echo "  sudo -u postgres psql -d reservamesa_db -c \"SELECT id, confirmation_token, status FROM reservations ORDER BY created_at DESC LIMIT 5;\""
