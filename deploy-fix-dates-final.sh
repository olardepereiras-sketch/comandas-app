#!/bin/bash

echo "🚀 SOLUCIÓN DEFINITIVA - CORRECCIÓN DE FECHAS Y LIMPIEZA"
echo "============================================================"
echo ""
echo "Este script:"
echo "  1. Limpia datos de prueba (reservas y excepciones)"
echo "  2. Corrige el manejo de fechas en frontend y backend"
echo "  3. Elimina la diferencia de 1 día"
echo ""

read -p "¿Continuar con el deploy? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

cd /var/www/reservamesa

echo ""
echo "📋 1. Limpiando datos de prueba..."
echo "------------------------------------------------------------"
bun backend/db/clean-test-data.ts

if [ $? -ne 0 ]; then
    echo "❌ Error en la limpieza de datos"
    exit 1
fi

echo ""
echo "📦 2. Reconstruyendo el frontend..."
echo "------------------------------------------------------------"
bun install --production 2>&1 | grep -v "warn"
NODE_ENV=production bunx expo export -p web --output-dir dist

if [ $? -ne 0 ]; then
    echo "❌ Error en la compilación del frontend"
    exit 1
fi

echo ""
echo "🔄 3. Reiniciando el servidor backend..."
echo "------------------------------------------------------------"
pm2 restart backend

echo ""
echo "🌐 4. Recargando nginx..."
echo "------------------------------------------------------------"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ DEPLOY COMPLETADO EXITOSAMENTE"
echo "============================================================"
echo ""
echo "📌 CAMBIOS APLICADOS:"
echo ""
echo "   ✅ Frontend (reservations-pro.tsx):"
echo "      - Usa función formatDateToYYYYMMDD() para formato consistente"
echo "      - Elimina .toISOString() que causaba diferencias de timezone"
echo ""
echo "   ✅ Backend (routes):"
echo "      - available-slots: Usa getFullYear/getMonth/getDate (NO UTC)"
echo "      - reservations/list: Convierte fechas DB a formato YYYY-MM-DD"
echo "      - day-exceptions: Maneja correctamente fechas sin timezone"
echo ""
echo "   ✅ Base de datos:"
echo "      - Reservas de prueba eliminadas"
echo "      - Excepciones de día eliminadas"
echo "      - Horarios base mantenidos"
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo ""
echo "   1. Abre el calendario de Reservas Pro"
echo "   2. Abre/cierra días y configura turnos"
echo "   3. Verifica que los días coincidan en:"
echo "      - Calendario de Reservas Pro"
echo "      - Vista del cliente"
echo ""
echo "   4. Verifica que se guarde correctamente:"
echo "      - Estado abierto/cerrado"
echo "      - Cantidad de comensales por turno"
echo "      - Configuración Pro (tiempo mínimo anticipación)"
echo ""
echo "============================================================"
