#!/bin/bash

echo "🚀 DESPLIEGUE - VALORACIONES DETALLADAS Y CORRECCIÓN DE TURNOS"
echo "============================================================"
echo ""
echo "Este script:"
echo "  1. Agrega campos de valoración detallada a la base de datos"
echo "  2. Corrige el manejo de turnos en Reservas Pro"
echo "  3. Añade funcionalidad de borrado de clientes"
echo "  4. Reconstruye el frontend con los cambios"
echo ""
read -p "¿Continuar con el deploy? (s/n): " confirm

if [ "$confirm" != "s" ]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

echo ""
echo "📋 1. Ejecutando migración de base de datos..."
echo "------------------------------------------------------------"
bun run backend/db/add-detailed-ratings.ts
if [ $? -ne 0 ]; then
    echo "❌ Error en la migración de base de datos"
    exit 1
fi

echo ""
echo "📦 2. Reconstruyendo el frontend..."
echo "------------------------------------------------------------"
bun run build:web

if [ $? -ne 0 ]; then
    echo "❌ Error en el build del frontend"
    exit 1
fi

echo ""
echo "🔄 3. Reiniciando el servidor backend..."
echo "------------------------------------------------------------"
pm2 restart rork-backend

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
echo "   ✅ Base de datos:"
echo "      - Añadidos campos de valoración detallada"
echo "      - rating_punctuality, rating_behavior, rating_kindness"
echo "      - rating_education, rating_tip, total_no_shows"
echo ""
echo "   ✅ Frontend (reservations-pro.tsx):"
echo "      - Corregido handleShiftToggle para extraer turnos del horario base"
echo "      - Ya no crea turnos con startTime=endTime y maxGuestsPerHour=0"
echo "      - Valoraciones detalladas implementadas en modal"
echo "      - Puntuación del cliente visible al lado del nombre"
echo ""
echo "   ✅ Backend:"
echo "      - Ruta delete para clientes implementada"
echo "      - Validación de reservas antes de borrar"
echo "      - Cálculo de rating promedio con 1 decimal"
echo ""
echo "   ✅ Módulo usuarios (admin/users.tsx):"
echo "      - Borrado con confirmación doble"
echo "      - Visualización de valoraciones detalladas"
echo "      - Grid de valoraciones: Puntualidad, Conducta, etc."
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo ""
echo "   1. Verifica que los turnos ahora aparecen para el cliente:"
echo "      - Abre Reservas Pro y configura turnos en un día"
echo "      - Ve a la vista del cliente y verifica horarios disponibles"
echo ""
echo "   2. Prueba las valoraciones detalladas:"
echo "      - Valora un cliente después de su reserva"
echo "      - Verifica que aparece el corazón con puntuación"
echo "      - Revisa en admin/users las valoraciones detalladas"
echo ""
echo "   3. Prueba el borrado de clientes:"
echo "      - Intenta borrar un cliente sin reservas"
echo "      - Confirma la doble validación"
echo ""
echo "============================================================"
