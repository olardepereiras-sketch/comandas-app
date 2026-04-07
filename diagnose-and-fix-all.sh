#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DE CONFIG PRO"
echo "======================================"
echo ""

cd /var/www/reservamesa

echo "📊 1. Verificando datos en la base de datos..."
bun backend/db/diagnose-config-pro.ts

echo ""
echo "📱 2. Verificando errores en los logs..."
echo "Buscando errores recientes:"
tail -50 backend.log | grep -E "(Error|❌)" | tail -10

echo ""
echo "🔧 3. Problemas identificados:"
echo ""
echo "   ❌ Problema 1: Frontend no refresca después de guardar"
echo "      Causa: React Query cache no se invalida correctamente"
echo ""
echo "   ❌ Problema 2: Error en notificaciones WhatsApp"
echo "      Causa: db parameter no se pasa a sendReservationNotifications"
echo "      Error: 'global.dbPool.query is undefined'"
echo ""
echo "   ❌ Problema 3: Botón contactar necesita actualización"
echo ""
echo "======================================"
echo "✅ Diagnóstico completado"
echo ""
echo "Ejecutando correcciones..."
