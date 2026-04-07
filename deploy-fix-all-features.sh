#!/bin/bash

echo "🚀 Desplegando correcciones completas..."
echo "========================================"

# Cargar variables de entorno
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Variables de entorno cargadas"
else
  echo "❌ Error: No se encontró el archivo .env"
  exit 1
fi

# 1. Corregir esquema de base de datos
echo ""
echo "📋 1. Corrigiendo esquema de base de datos..."
echo "------------------------------------------------------------"
bun backend/db/fix-complete-schema.ts
if [ $? -ne 0 ]; then
  echo "❌ Error corrigiendo esquema"
  exit 1
fi
echo "✅ Esquema corregido"

# 2. Reconstruir frontend
echo ""
echo "🔨 2. Reconstruyendo frontend..."
echo "------------------------------------------------------------"
cd /var/www/reservamesa
bun run build:web
if [ $? -ne 0 ]; then
  echo "❌ Error en build del frontend"
  exit 1
fi
echo "✅ Frontend reconstruido"

# 3. Reiniciar servidor
echo ""
echo "🔄 3. Reiniciando servidor..."
echo "------------------------------------------------------------"
if command -v pm2 &> /dev/null; then
  pm2 restart reservamesa-server
  echo "✅ Servidor reiniciado con PM2"
else
  pkill -f "bun.*backend/server.ts" || true
  nohup bun backend/server.ts > server.log 2>&1 &
  echo "✅ Servidor reiniciado"
fi

echo ""
echo "✅ Despliegue completado exitosamente!"
echo ""
echo "📝 Cambios aplicados:"
echo "  ✓ Tabla rating_criteria con columna updated_at"
echo "  ✓ Tabla day_exceptions con mensaje día especial"
echo "  ✓ Confirmación antes de borrar usuarios y reservas"
echo "  ✓ Soporte para valoración local en turnos"
echo "  ✓ Frontend actualizado"
echo ""
