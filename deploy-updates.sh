#!/bin/bash

echo "🚀 Desplegando actualizaciones..."

echo ""
echo "📋 Cambios incluidos:"
echo "  1. ✅ Asignación automática de mesas por prioridad"
echo "  2. ✅ Sistema de plantillas de turnos"
echo "  3. ✅ Gestión de excepciones de días"
echo "  4. ✅ Visualización de clientes en admin"
echo ""

echo "🔄 Ejecutando migraciones de base de datos..."
bun run backend/db/add-priority-and-shifts.ts

if [ $? -ne 0 ]; then
  echo "❌ Error ejecutando migraciones"
  exit 1
fi

echo "🧹 Limpiando archivos anteriores..."
rm -rf dist .expo

echo "📦 Compilando frontend..."
bunx expo export -p web

if [ $? -ne 0 ]; then
  echo "❌ Error compilando frontend"
  exit 1
fi

echo "🔄 Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
bun backend/server.ts > backend.log 2>&1 &

echo "🔄 Recargando nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Despliegue completado exitosamente"
echo ""
echo "📝 Resumen de cambios:"
echo ""
echo "1. ASIGNACIÓN AUTOMÁTICA DE MESAS:"
echo "   - El sistema ahora asigna automáticamente las mesas según prioridad (1-9)"
echo "   - Las mesas con mayor prioridad se ocupan primero"
echo "   - Configura la prioridad en: /restaurant/tables"
echo ""
echo "2. SISTEMA DE PLANTILLAS DE TURNOS:"
echo "   - Crea plantillas reutilizables (ej: 'Comidas', 'Cenas')"
echo "   - Define horarios por plantilla (13:00, 13:30, 14:00...)"
echo "   - Aplica plantillas a cada día de la semana"
echo "   - Gestiona todo desde: /restaurant/schedules"
echo ""
echo "3. EXCEPCIONES DE DÍAS (Backend preparado):"
echo "   - Sistema backend listo para gestionar días especiales"
echo "   - Podrás abrir/cerrar días individuales"
echo "   - Aplicar turnos específicos a fechas concretas"
echo ""
echo "4. CLIENTES EN ADMIN:"
echo "   - Visualiza todos los clientes registrados"
echo "   - Busca por nombre, email o teléfono"
echo "   - Ver en: /admin/users"
echo ""
