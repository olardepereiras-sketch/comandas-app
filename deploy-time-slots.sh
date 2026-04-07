#!/bin/bash

echo "🚀 Desplegando sistema de franjas horarias..."
echo "========================================"

# Crear tabla de time_slots
echo ""
echo "📋 1. Creando tabla de time_slots..."
echo "------------------------------------------------------------"
bun backend/db/add-time-slots-table.ts
if [ $? -eq 0 ]; then
  echo "✅ Tabla de time_slots creada correctamente"
else
  echo "❌ Error creando tabla de time_slots"
  exit 1
fi

# Rebuild frontend
echo ""
echo "🔨 2. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web
if [ $? -eq 0 ]; then
  echo "✅ Frontend reconstruido correctamente"
else
  echo "❌ Error reconstruyendo frontend"
  exit 1
fi

# Restart backend
echo ""
echo "🔄 3. Reiniciando backend..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts"
nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Backend reiniciado"

# Reload nginx
echo ""
echo "🔄 4. Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx
if [ $? -eq 0 ]; then
  echo "✅ Nginx recargado correctamente"
else
  echo "❌ Error recargando nginx"
  exit 1
fi

echo ""
echo "✅ ¡Despliegue completado con éxito!"
echo "========================================"
echo ""
echo "📝 Resumen de cambios:"
echo "  • Módulo 'Ubicaciones' renombrado a 'Ubicaciones y horas'"
echo "  • Nueva pestaña 'Horas' en admin/locations"
echo "  • Gestión de franjas horarias disponibles"
echo "  • Búsqueda solo muestra resultados después de pulsar botón"
echo "  • Horas del buscador cargan desde la base de datos"
echo "  • Tipos de cocina se cargan por provincia"
echo "  • Validación: no se puede seleccionar tipo de cocina sin provincia"
echo ""
