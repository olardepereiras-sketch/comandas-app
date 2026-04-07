#!/bin/bash

echo "🚀 Desplegando corrección de guardado de configuración y fechas"
echo "================================================================"

echo ""
echo "📦 Reconstruyendo el frontend..."
bunx expo export -p web --output-dir dist

echo ""
echo "🔄 Reiniciando el servidor backend..."
pm2 restart reservamesa

echo ""
echo "🌐 Recargando nginx..."
sudo nginx -s reload

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "🔧 Correcciones aplicadas:"
echo "   - Arreglados placeholders SQL en auto_send_whatsapp y min_booking_advance_minutes"
echo "   - Corregido manejo de fechas UTC para evitar pérdida de días"
echo "   - Ahora los días abiertos en calendario coincidirán con los días del cliente"
