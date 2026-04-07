#!/bin/bash

set -e

echo "🚀 CORRECCIÓN DE SHIFTS Y DESPLIEGUE"
echo "====================================="
echo ""
echo "Este script:"
echo "  1. Corrige el archivo env"
echo "  2. Corrige los datos de shifts en la base de datos"
echo "  3. Reconstruye el frontend con las correcciones"
echo ""

read -p "¿Continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Cancelado"
    exit 1
fi

echo ""
echo "📋 1. Cargando variables de entorno..."
echo "------------------------------------------------------------"
source env
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está definida"
    exit 1
fi
echo "✅ Variables cargadas"

echo ""
echo "📋 2. Corrigiendo datos de shifts en la base de datos..."
echo "------------------------------------------------------------"
bun backend/db/fix-shifts-data.ts

echo ""
echo "📦 3. Reconstruyendo el frontend..."
echo "------------------------------------------------------------"
rm -rf dist .expo
bunx expo export -p web

echo ""
echo "🔄 4. Reiniciando el servidor..."
echo "------------------------------------------------------------"
pkill -f "bun.*backend/server.ts" || true
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado (PID: $!)"

echo ""
echo "🔄 5. Recargando nginx..."
echo "------------------------------------------------------------"
sudo systemctl reload nginx

echo ""
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo ""
echo "📋 Resumen de cambios:"
echo "  • Archivo env corregido"
echo "  • Shifts de day_exceptions corregidos (startTime ≠ endTime)"
echo "  • Shift templates ahora devuelven startTime y endTime"
echo "  • Frontend actualizado con la lógica correcta"
echo ""
echo "🔍 Verifica que ahora los horarios se muestren correctamente en:"
echo "  • http://200.234.236.133/client"
echo "  • http://200.234.236.133/restaurant/reservations-pro"
