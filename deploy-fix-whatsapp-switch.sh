#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE SWITCH WHATSAPP"
echo "============================================="
echo ""

# Paso 1: Detener servidor
echo "📋 Paso 1/3: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
echo ""

# Paso 2: Limpiar caché
echo "📋 Paso 2/3: Limpiando caché..."
cd /var/www/reservamesa
rm -rf dist .expo
echo ""

# Paso 3: Reiniciar servidor
echo "📋 Paso 3/3: Reiniciando servidor..."
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo ""

echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Activa 'Usar WhatsApp Web'"
echo "   3. Escanea el código QR"
echo "   4. Activa 'Envío Automático de WhatsApp'"
echo "   5. Ahora el switch debería quedarse activado"
echo ""
echo "💡 Si el switch aún se desactiva, revisa los logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
