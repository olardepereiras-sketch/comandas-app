#!/bin/bash

echo "🔧 DESPLEGANDO CORRECCIONES COMPLETAS DE RESERVAS..."
echo "===================================================="

# Detener servidor
echo ""
echo "📋 Paso 1/4: Deteniendo servidor..."
pm2 stop backend 2>/dev/null || echo "No hay procesos PM2 activos"

# Limpiar caché
echo ""
echo "📋 Paso 2/4: Limpiando caché..."
rm -rf dist/
rm -rf .expo/

# Reconstruir frontend
echo ""
echo "📋 Paso 3/4: Reconstruyendo frontend..."
npx expo export -p web

# Reiniciar servidor
echo ""
echo "📋 Paso 4/4: Reiniciando servidor..."
pm2 start ecosystem.config.js --env production

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "Cambios aplicados:"
echo "  ✅ Herencia correcta de configuración desde módulo horarios"
echo "  ✅ Plantillas automáticamente seleccionadas y desplegadas"
echo "  ✅ Valores de comensales máximos heredados correctamente"
echo "  ✅ Colores de días abiertos/cerrados sincronizados"
echo "  ✅ Calendario de Reservas mejorado con más información"
echo "  ✅ Día actual seleccionado automáticamente"
echo "  ✅ Reservas con fondo verde (confirmadas) y gris (anuladas)"
echo ""
echo "Prueba los cambios en:"
echo "  📅 https://quieromesa.com/restaurant/reservations-pro"
echo "  📋 https://quieromesa.com/restaurant/reservations"
echo ""
echo "Ver logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
