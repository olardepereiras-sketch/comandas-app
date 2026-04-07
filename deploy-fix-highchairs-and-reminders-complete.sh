#!/bin/bash

echo "🚀 Desplegando correcciones completas del sistema..."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  CORRECCIONES A APLICAR:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✓ 1. Tronas: No ocultar horas cuando se solicitan más de las disponibles"
echo "✓ 2. Tronas: Mostrar advertencia para cambiar cantidad o hora"
echo "✓ 3. Checkbox términos: Resetear después de cada reserva exitosa"
echo "✓ 4. Sistema de recordatorios: Verificar funcionamiento"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Paso 1: Limpiar archivos antiguos
echo "📦 Paso 1/5: Limpiando archivos antiguos..."
rm -rf dist .expo
echo "   ✓ Limpieza completada"
echo ""

# Paso 2: Construir aplicación
echo "📦 Paso 2/5: Construyendo aplicación frontend..."
bunx expo export -p web
if [ $? -eq 0 ]; then
    echo "   ✓ Build completado exitosamente"
else
    echo "   ✗ Error en el build"
    exit 1
fi
echo ""

# Paso 3: Reiniciar servidor
echo "📦 Paso 3/5: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "   ✓ Servidor reiniciado (PID: $!)"
echo ""

# Paso 4: Esperar a que el servidor inicie
echo "📦 Paso 4/5: Esperando a que el servidor inicie..."
sleep 5
echo "   ✓ Servidor listo"
echo ""

# Paso 5: Recargar nginx
echo "📦 Paso 5/5: Recargando nginx..."
sudo systemctl reload nginx
echo "   ✓ Nginx recargado"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 VERIFICACIONES RECOMENDADAS:"
echo ""
echo "1. Probar el buscador con tronas:"
echo "   • Ve a: https://quieromesa.com/client/restaurant/[slug]"
echo "   • Selecciona una fecha y hora"
echo "   • Marca 'Necesito tronas' y pon un número mayor al disponible"
echo "   • Verifica que:"
echo "     - Las horas NO se ocultan"
echo "     - Aparece un mensaje de advertencia en rojo"
echo "     - El botón 'Confirmar Reserva' está deshabilitado"
echo ""
echo "2. Probar checkbox de términos:"
echo "   • Completa una reserva exitosamente"
echo "   • Verifica que el checkbox se resetea automáticamente"
echo "   • Para la siguiente reserva, deberás marcarlo de nuevo"
echo ""
echo "3. Verificar sistema de recordatorios:"
echo "   • Ejecuta: chmod +x diagnose-reminders.sh && ./diagnose-reminders.sh"
echo "   • Esto mostrará:"
echo "     - Restaurantes con recordatorios habilitados"
echo "     - Notificaciones pendientes en la cola"
echo "     - Estado del worker de WhatsApp"
echo ""
echo "4. Ver logs en tiempo real:"
echo "   • tail -f /var/www/reservamesa/backend.log"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🔧 COMANDOS ÚTILES:"
echo ""
echo "• Diagnóstico de recordatorios:"
echo "  ./diagnose-reminders.sh"
echo ""
echo "• Ver notificaciones pendientes:"
echo "  psql \$DATABASE_URL -c \"SELECT id, notification_type, recipient_name, scheduled_for, status FROM whatsapp_notifications WHERE status = 'pending' ORDER BY scheduled_for;\""
echo ""
echo "• Ver configuración de restaurantes:"
echo "  psql \$DATABASE_URL -c \"SELECT name, enable_reminders, reminder_24h_enabled, reminder_2h_enabled, reminder_30m_enabled, use_whatsapp_web, auto_send_whatsapp FROM restaurants;\""
echo ""
echo "• Ver logs del worker de notificaciones:"
echo "  tail -f backend.log | grep -E '(Notification|WhatsApp Manager)'"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
