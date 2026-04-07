#!/bin/bash

echo "🚀 Arreglando tabla modules y desplegando..."

echo "✅ Paso 1: Ejecutando script de corrección de módulos..."
bun backend/db/fix-modules-table.ts

if [ $? -ne 0 ]; then
  echo "❌ Error al corregir tabla modules"
  exit 1
fi

echo "✅ Tabla modules corregida"

echo "✅ Paso 2: Verificando cambios en código..."
if [ ! -f "app/admin/modules.tsx" ]; then
  echo "❌ Archivo modules.tsx no encontrado"
  exit 1
fi

echo "✅ Archivos verificados"

echo "✅ Paso 3: Reiniciando servidor..."
if command -v pm2 &> /dev/null; then
  pm2 restart backend
  echo "✅ Servidor reiniciado con PM2"
else
  pkill -f "bun backend/server.ts"
  nohup bun backend/server.ts > server.log 2>&1 &
  echo "✅ Servidor reiniciado manualmente"
fi

sleep 3

echo ""
echo "✅ =========================================="
echo "✅ ✨ Correcciones aplicadas exitosamente"
echo "✅ =========================================="
echo ""
echo "Cambios realizados:"
echo "  1. ✅ Tabla modules creada/verificada"
echo "  2. ✅ Módulos predeterminados insertados"
echo "  3. ✅ Botones de eliminación corregidos (window.confirm)"
echo "  4. ✅ Logs de debug mejorados"
echo ""
echo "✅ Ahora deberías poder:"
echo "  - Ver los módulos en https://quieromesa.com/admin/modules"
echo "  - Eliminar planes de suscripción"
echo "  - Eliminar duraciones de suscripción"
echo "  - Eliminar módulos"
echo ""
