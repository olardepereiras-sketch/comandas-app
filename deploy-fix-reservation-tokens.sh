#!/bin/bash

echo "🔧 ARREGLANDO PROBLEMA DE TOKENS DE RESERVA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /var/www/reservamesa

echo "📋 Paso 1: Verificando estructura de tokens en la base de datos..."
echo ""
sudo -u postgres psql -d reservamesa_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations' AND column_name IN ('confirmation_token', 'token', 'confirmation_token2');"

echo ""
echo "📋 Paso 2: Contando reservas con tokens NULL..."
NULL_COUNT=$(sudo -u postgres psql -t -d reservamesa_db -c "SELECT COUNT(*) FROM reservations WHERE confirmation_token IS NULL OR confirmation_token = '';")
NULL_COUNT=$(echo $NULL_COUNT | xargs)
echo "Reservas con confirmation_token NULL: $NULL_COUNT"

if [ "$NULL_COUNT" -gt 0 ]; then
  echo ""
  echo "⚠️ Paso 3: Arreglando tokens NULL..."
  sudo -u postgres psql -d reservamesa_db <<EOF
    UPDATE reservations 
    SET confirmation_token = 'token-' || EXTRACT(EPOCH FROM created_at)::bigint * 1000 || '-' || SUBSTRING(id FROM 5)
    WHERE confirmation_token IS NULL OR confirmation_token = '';
EOF
  echo "✅ Tokens actualizados"
else
  echo ""
  echo "✅ Paso 3: No hay tokens NULL para arreglar"
fi

echo ""
echo "📋 Paso 4: Verificando tokens después del arreglo..."
sudo -u postgres psql -d reservamesa_db -c "SELECT id, client_name, date, status, LENGTH(confirmation_token) as token_length, SUBSTRING(confirmation_token, 1, 20) as token_preview FROM reservations ORDER BY created_at DESC LIMIT 5;"

echo ""
echo "📋 Paso 5: Limpiando caché de frontend..."
rm -rf dist .expo

echo ""
echo "📋 Paso 6: Compilando frontend actualizado..."
bunx expo export -p web

if [ $? -eq 0 ]; then
  echo "✅ Frontend compilado exitosamente"
else
  echo "❌ Error compilando frontend"
  exit 1
fi

echo ""
echo "📋 Paso 7: Deteniendo servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2

echo ""
echo "📋 Paso 8: Iniciando servidor backend con código actualizado..."
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor backend iniciado"

echo ""
echo "📋 Paso 9: Recargando Nginx..."
sudo systemctl reload nginx

echo ""
echo "📋 Paso 10: Esperando que el servidor inicie..."
sleep 3

echo ""
echo "📋 Paso 11: Verificando que el servidor esté corriendo..."
if pgrep -f "bun.*backend/server.ts" > /dev/null; then
  echo "✅ Servidor backend corriendo"
else
  echo "❌ Servidor backend NO está corriendo"
  echo "Últimas líneas del log:"
  tail -n 20 backend.log
  exit 1
fi

echo ""
echo "📋 Paso 12: Verificando logs del backend..."
echo "Últimas líneas del log:"
tail -n 15 backend.log

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Para probar:"
echo "  1. Obtén un token de prueba:"
echo "     sudo -u postgres psql -d reservamesa_db -c \"SELECT confirmation_token FROM reservations WHERE status != 'cancelled' ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "  2. Accede a la URL:"
echo "     https://quieromesa.com/client/reservation/[TOKEN]"
echo ""
echo "  3. Verifica que se muestre:"
echo "     - Información completa de la reserva"
echo "     - Botón de llamar al restaurante"
echo "     - Botones de modificar y cancelar (si aún está dentro del tiempo permitido)"
echo ""
echo "📝 Los botones de modificar/cancelar desaparecerán automáticamente"
echo "   según el 'Tiempo Mínimo de Modificación/Cancelación' configurado"
echo "   en Configuración Pro del restaurante (por defecto 3 horas antes)."
