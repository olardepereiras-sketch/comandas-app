#!/bin/bash

echo "🚀 DESPLEGANDO SISTEMA COMPLETO DE MODIFICACIÓN DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Este script soluciona:"
echo "  1. ✅ Tabla whatsapp_notifications sin columna updated_at"
echo "  2. ✅ Modificación mantiene el mismo token"
echo "  3. ✅ Notificación WhatsApp al restaurante sobre modificación"
echo "  4. ✅ Programación inteligente de recordatorios según tiempo restante"
echo "  5. ✅ Elimina notificaciones pendientes de reserva cancelada"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

set -e

echo "📋 Paso 1: Arreglando esquema de whatsapp_notifications..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun run backend/db/fix-whatsapp-notifications-table-schema.ts
echo "✅ Esquema de notificaciones arreglado"
echo ""

echo "📋 Paso 2: Limpiando caché de frontend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rm -rf dist .expo
echo "✅ Caché limpiado"
echo ""

echo "📋 Paso 3: Compilando frontend actualizado..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx expo export -p web
echo "✅ Frontend compilado"
echo ""

echo "📋 Paso 4: Deteniendo servidor backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pkill -f "bun.*backend/server.ts" || echo "No hay servidor corriendo"
sleep 2
echo "✅ Servidor detenido"
echo ""

echo "📋 Paso 5: Iniciando servidor backend con código actualizado..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"
echo ""

echo "📋 Paso 6: Recargando Nginx..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo systemctl reload nginx
echo "✅ Nginx recargado"
echo ""

echo "📋 Paso 7: Esperando que el servidor inicie (10 segundos)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10
echo "✅ Espera completada"
echo ""

echo "📋 Paso 8: Verificando estado del servidor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Servidor corriendo correctamente (PID: $SERVER_PID)"
else
    echo "❌ Error: El servidor no está corriendo"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi
echo ""

echo "📋 Paso 9: Verificando logs del backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Últimas líneas del log:"
tail -20 backend.log
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 SISTEMA DE MODIFICACIÓN DE RESERVAS ACTUALIZADO"
echo ""
echo "📝 CAMBIOS APLICADOS:"
echo ""
echo "  ✅ Token de reserva se mantiene después de modificar"
echo "     - El cliente puede seguir usando el mismo enlace"
echo "     - Puede modificar/cancelar hasta el tiempo límite"
echo ""
echo "  ✅ Notificación al restaurante sobre modificaciones"
echo "     - WhatsApp con mensaje especial ⚠️ RESERVA MODIFICADA"
echo "     - Incluye nuevos datos de la reserva"
echo ""
echo "  ✅ Recordatorios inteligentes"
echo "     - Si falta más de 24h: envía ambos recordatorios"
echo "     - Si falta menos de 24h pero más de 60m: solo recordatorio 2"
echo "     - Si falta menos de 60m: no envía recordatorios"
echo ""
echo "  ✅ Limpieza de notificaciones"
echo "     - Elimina recordatorios pendientes de reserva cancelada"
echo "     - Evita enviar recordatorios de reservas modificadas/canceladas"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 PRUEBAS:"
echo ""
echo "  1. Crear una reserva desde:"
echo "     https://quieromesa.com/client/restaurant/o-lar-de-pereiras"
echo ""
echo "  2. Abrir el enlace del token recibido por WhatsApp"
echo ""
echo "  3. Modificar la reserva (cambiar fecha/hora/comensales)"
echo ""
echo "  4. Verificar que:"
echo "     - ✅ El mismo enlace muestra la nueva reserva"
echo "     - ✅ El restaurante recibe WhatsApp de modificación"
echo "     - ✅ Se programan recordatorios según tiempo restante"
echo "     - ✅ Cliente puede volver a modificar con el mismo enlace"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Para ver logs en tiempo real:"
echo "  tail -f backend.log"
echo ""
echo "🔄 Para reiniciar el servidor:"
echo "  pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
echo ""
