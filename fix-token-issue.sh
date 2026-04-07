#!/bin/bash

echo "🔧 ARREGLANDO PROBLEMA DE TOKENS EN RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1: Verificando estructura de tabla reservations..."
sudo -u postgres psql -d reservamesa_db -c "\d reservations" | grep -E "(confirmation_token|token)" || true

echo ""
echo "📋 Paso 2: Verificando datos actuales de tokens..."
sudo -u postgres psql -d reservamesa_db -c "SELECT id, client_name, confirmation_token, token FROM reservations ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "📋 Paso 3: Verificando si hay tokens NULL..."
NULL_TOKENS=$(sudo -u postgres psql -t -d reservamesa_db -c "SELECT COUNT(*) FROM reservations WHERE confirmation_token IS NULL OR confirmation_token = '';")
echo "Reservas con token NULL: $NULL_TOKENS"

echo ""
echo "📋 Paso 4: Arreglando tokens NULL (si hay)..."
if [ "$NULL_TOKENS" -gt 0 ]; then
  echo "⚠️ Actualizando tokens NULL..."
  sudo -u postgres psql -d reservamesa_db -c "
    UPDATE reservations 
    SET confirmation_token = 'token-' || EXTRACT(EPOCH FROM created_at)::bigint * 1000 || '-' || id
    WHERE confirmation_token IS NULL OR confirmation_token = '';
  "
  echo "✅ Tokens actualizados"
else
  echo "✅ No hay tokens NULL"
fi

echo ""
echo "📋 Paso 5: Verificando que el archivo de ruta existe..."
if [ -f "backend/trpc/routes/reservations/get-by-token/route.ts" ]; then
  echo "✅ Archivo de ruta existe"
else
  echo "❌ Archivo de ruta NO existe"
fi

echo ""
echo "📋 Paso 6: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "📋 Paso 7: Esperando que el servidor inicie..."
sleep 3

echo ""
echo "📋 Paso 8: Verificando logs del backend..."
tail -n 20 /var/www/reservamesa/backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PROCESO COMPLETADO"
echo ""
echo "Para probar:"
echo "  1. Obtén un token de una reserva:"
echo "     sudo -u postgres psql -d reservamesa_db -c \"SELECT confirmation_token FROM reservations ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "  2. Prueba la URL en el navegador:"
echo "     https://quieromesa.com/client/reservation/[TOKEN]"
