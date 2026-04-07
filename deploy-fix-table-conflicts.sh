#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIÓN DE CONFLICTOS DE MESAS Y WHATSAPP"
echo "==========================================================="
echo ""

# Detener servidor
echo "📋 Paso 1/6: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || true
sleep 2

# Limpiar caché
echo "📋 Paso 2/6: Limpiando caché..."
rm -rf dist/ .expo/ node_modules/.cache/ 2>/dev/null || true

# Ejecutar diagnóstico de conflictos
echo "📋 Paso 3/6: Ejecutando diagnóstico de conflictos..."
chmod +x diagnose-table-conflicts.sh
./diagnose-table-conflicts.sh

# Verificar configuración de Twilio/WhatsApp
echo ""
echo "📋 Paso 4/6: Verificando configuración de WhatsApp..."
echo ""
echo "Variables de entorno configuradas:"
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
  echo "  ✅ TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID:0:10}..."
else
  echo "  ❌ TWILIO_ACCOUNT_SID: NO CONFIGURADA"
fi

if [ -n "$TWILIO_AUTH_TOKEN" ]; then
  echo "  ✅ TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:0:10}..."
else
  echo "  ❌ TWILIO_AUTH_TOKEN: NO CONFIGURADA"
fi

if [ -n "$TWILIO_WHATSAPP_FROM" ]; then
  echo "  ✅ TWILIO_WHATSAPP_FROM: $TWILIO_WHATSAPP_FROM"
else
  echo "  ❌ TWILIO_WHATSAPP_FROM: NO CONFIGURADA"
fi

echo ""
echo "Para habilitar WhatsApp automático, asegúrese de:"
echo "  1. Configurar las variables de entorno de Twilio en .env"
echo "  2. En config-pro del restaurante, activar 'Envío Automático de WhatsApp'"
echo ""

# Reconstruir frontend
echo "📋 Paso 5/6: Reconstruyendo frontend..."
bun run export:web
if [ $? -ne 0 ]; then
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi

# Reiniciar servidor
echo "📋 Paso 6/6: Reiniciando servidor..."
pm2 restart backend || pm2 start backend/server.ts --name backend --interpreter bun
sleep 3

# Recargar nginx
echo "📋 Paso 7/7: Recargando nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Lógica de asignación de mesas corregida (verifica rotation_time_minutes)"
echo "  ✅ Lógica de actualización de mesas corregida (impide conflictos)"
echo "  ✅ Script de diagnóstico creado"
echo ""
echo "Próximos pasos para WhatsApp:"
echo "  1. Configure las variables de Twilio si aún no lo ha hecho"
echo "  2. Active 'Envío Automático' en config-pro de cada restaurante"
echo ""
echo "Para verificar conflictos de mesas en cualquier momento:"
echo "  ./diagnose-table-conflicts.sh"
echo ""
echo "Ver logs del servidor:"
echo "  tail -f /var/www/reservamesa/backend.log"
