#!/bin/bash

echo "🔍 Ejecutando diagnóstico del sistema de recordatorios..."
echo ""

cd /var/www/reservamesa
bun backend/scripts/diagnose-reminders.ts

echo ""
echo "📋 Comandos útiles:"
echo ""
echo "Ver notificaciones pendientes:"
echo "  psql \$DATABASE_URL -c \"SELECT id, notification_type, recipient_name, scheduled_for, status, attempts FROM whatsapp_notifications WHERE status = 'pending' ORDER BY scheduled_for;\""
echo ""
echo "Ver últimas reservas creadas:"
echo "  psql \$DATABASE_URL -c \"SELECT id, client_name, date, time, created_at FROM reservations ORDER BY created_at DESC LIMIT 5;\""
echo ""
echo "Verificar configuración de recordatorios por restaurante:"
echo "  psql \$DATABASE_URL -c \"SELECT name, enable_reminders, reminder_24h_enabled, reminder_2h_enabled, reminder_30m_enabled, use_whatsapp_web, auto_send_whatsapp FROM restaurants;\""
echo ""
echo "Ver logs del worker en tiempo real:"
echo "  tail -f /var/www/reservamesa/backend.log | grep 'Notification'"
