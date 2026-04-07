#!/bin/bash

echo "🔧 Desplegando correcciones para Reservas Pro y Configuración Pro"
echo "================================================"

# Ejecutar migración de base de datos
echo "📋 Ejecutando migraciones de base de datos..."
cd /home/reservamesa/rork-app
bun run backend/db/fix-day-exceptions-and-rotation.ts

if [ $? -ne 0 ]; then
  echo "❌ Error al ejecutar las migraciones"
  exit 1
fi

echo "✅ Migraciones completadas"

# Reconstruir el frontend
echo "📦 Reconstruyendo el frontend..."
bun run export

if [ $? -ne 0 ]; then
  echo "❌ Error al construir el frontend"
  exit 1
fi

echo "✅ Frontend reconstruido"

# Reiniciar el servidor
echo "🔄 Reiniciando el servidor..."
pm2 restart reservamesa-server

if [ $? -ne 0 ]; then
  echo "❌ Error al reiniciar el servidor"
  exit 1
fi

echo "✅ Servidor reiniciado"

# Verificar el estado
echo "📊 Verificando el estado del servidor..."
pm2 status

echo ""
echo "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "Cambios aplicados:"
echo "  ✓ Columna table_rotation_time añadida a la tabla restaurants"
echo "  ✓ Tabla day_exceptions verificada y creada si no existía"
echo "  ✓ Frontend actualizado con correcciones:"
echo "    - Los días ahora se guardan correctamente al cambiar de cerrado a abierto"
echo "    - El tiempo de rotación de mesas se puede modificar en Configuración Pro"
echo ""
echo "Verifica en:"
echo "  - http://200.234.236.133/restaurant/reservations-pro"
echo "  - http://200.234.236.133/restaurant/config-pro"
