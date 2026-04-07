#!/bin/bash

echo "🔧 Aplicando corrección final del sistema de mesas temporales..."
echo ""

# Verificar que existe el archivo .env
if [ ! -f "env" ]; then
  echo "❌ Archivo env no encontrado"
  exit 1
fi

# Cargar variables de entorno
set -a
source ./env
set +a

echo "📊 Aplicando cambios a la base de datos..."

# Extraer credenciales del DATABASE_URL
# Formato: postgresql://usuario:password@host:puerto/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASSWORD="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
  
  echo "Host: $DB_HOST"
  echo "User: $DB_USER"
  echo "DB: $DB_NAME"
  echo ""
  
  # Aplicar el script SQL
  export PGPASSWORD="$DB_PASSWORD"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f backend/db/fix-temporary-tables-system.sql
else
  echo "❌ Error: DATABASE_URL no tiene el formato correcto"
  echo "Formato esperado: postgresql://usuario:password@host:puerto/database"
  echo "DATABASE_URL actual: $DATABASE_URL"
  exit 1
fi

if [ $? -eq 0 ]; then
  echo "✅ Base de datos actualizada correctamente"
else
  echo "❌ Error al actualizar la base de datos"
  exit 1
fi

echo ""
echo "🔄 Reiniciando servidor..."
pm2 restart reservamesa-backend

echo ""
echo "✅ Sistema de mesas temporales corregido"
echo ""
echo "📋 Cambios aplicados:"
echo "   - Nueva tabla 'temporary_tables' para mesas temporales"
echo "   - Nueva tabla 'table_blocks_for_split' para bloquear mesas originales"
echo "   - Las mesas temporales NO se mezclan con mesas reales"
echo "   - Las mesas originales NO se modifican, solo se bloquean"
echo "   - Mesa 1A y 1B se crean como temporales vinculadas a reserva"
echo "   - Limpieza automática al cancelar/completar reserva"
echo ""
echo "🔗 Nuevos endpoints disponibles:"
echo "   - reservations.createWithTableSplit (crear reserva dividiendo mesa)"
echo "   - reservations.cleanupTemporaryTables (limpiar mesas temporales)"
echo "   - tables.listWithTemporary (listar incluyendo temporales disponibles)"
echo ""
