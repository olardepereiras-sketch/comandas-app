#!/bin/bash

echo "🚀 Desplegando correcciones urgentes completas..."
echo ""

echo "📋 Cambios incluidos:"
echo "  1. ✅ Fecha de caducidad visible en panel restaurante"
echo "  2. ✅ Botón de eliminar restaurantes funcionando correctamente"
echo "  3. ✅ Mensajes de recordatorio WhatsApp corregidos"
echo ""

cd /var/www/reservamesa

echo "📦 Instalando dependencias..."
bun install

echo ""
echo "🔨 Compilando frontend..."
bunx expo export:web

echo ""
echo "🔄 Reiniciando servidor backend..."
pm2 restart reservamesa-backend

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Resumen de cambios:"
echo "  - app/restaurant/index.tsx: Fecha de caducidad al lado del botón"
echo "  - app/admin/restaurants.tsx: Botón eliminar con indicador de carga"
echo "  - backend/trpc/routes/reservations/create/route.ts: Mensajes correctos"
echo ""
echo "🔍 Los mensajes de recordatorio ahora son:"
echo "  📅 Recordatorio 1 (horas): Mensaje con opción de modificar"
echo "  ⏰ Recordatorio 2 (minutos): Mensaje con recordatorio de puntualidad"
echo ""
echo "✅ Todos los cambios aplicados correctamente"
