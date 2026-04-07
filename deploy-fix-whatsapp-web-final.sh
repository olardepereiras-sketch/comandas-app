#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE WHATSAPP WEB"
echo "=========================================="

cd /var/www/reservamesa

# Detener servidor
echo ""
echo "📋 Paso 1/3: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true
sleep 2

# Limpiar caché
echo ""
echo "📋 Paso 2/3: Limpiando caché..."
rm -rf node_modules/.cache
rm -rf .next

# Reiniciar servidor
echo ""
echo "📋 Paso 3/3: Reiniciando servidor..."
pm2 restart backend
sleep 3
pm2 logs backend --lines 30

echo ""
echo "✅ DESPLIEGUE COMPLETADO"
echo ""
echo "📱 Próximos pasos:"
echo "   1. Ve a https://quieromesa.com/restaurant/config-pro"
echo "   2. Desactiva y vuelve a activar 'Usar WhatsApp Web'"
echo "   3. Si es necesario, escanea el código QR de nuevo"
echo "   4. Activa 'Envío Automático de WhatsApp'"
echo "   5. Crea una reserva de prueba"
echo ""
echo "💡 Monitorear logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
