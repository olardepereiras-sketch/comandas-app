#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN: AUTO-GUARDADO DE WHATSAPP WEB"
echo "========================================================"
echo ""

cd /var/www/reservamesa || exit 1

echo "📋 Paso 1/4: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo ""

echo "📋 Paso 2/4: Limpiando caché del frontend..."
rm -rf dist/
rm -rf .expo/
echo "✅ Caché limpiado"
echo ""

echo "📋 Paso 3/4: Reconstruyendo frontend..."
bun run export > /dev/null 2>&1 &
EXPORT_PID=$!

# Esperar hasta 3 minutos
TIMEOUT=180
ELAPSED=0
while kill -0 $EXPORT_PID 2>/dev/null; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "⚠️ Timeout alcanzado, continuando..."
        kill $EXPORT_PID 2>/dev/null || true
        break
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    echo "⏳ Esperando... ${ELAPSED}s"
done

echo "✅ Frontend reconstruido"
echo ""

echo "📋 Paso 4/4: Reiniciando servidor..."
nohup bun run backend/server.ts > backend.log 2>&1 &
sleep 3
echo ""

echo "📋 Recargando Nginx..."
nginx -s reload
echo ""

echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Cambios implementados:"
echo "   - Los switches de WhatsApp se guardan automáticamente"
echo "   - Ya no es necesario hacer clic en 'Guardar Cambios'"
echo "   - Mejor experiencia de usuario"
echo ""
echo "🧪 Prueba el sistema:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa 'Usar WhatsApp Web' (se guarda automáticamente)"
echo "   3. Escanea el código QR"
echo "   4. Crea una reserva de prueba"
echo "   5. Deberías recibir el mensaje por WhatsApp"
echo ""
echo "💡 Monitoreando logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
