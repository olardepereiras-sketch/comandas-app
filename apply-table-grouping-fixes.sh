#!/bin/bash

set -e

echo "🔧 Aplicando correcciones para agrupación y división de mesas..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Obtener el directorio del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Cargar variables de entorno
if [ -f "$SCRIPT_DIR/env" ]; then
    set -a
    source "$SCRIPT_DIR/env"
    set +a
    echo -e "${GREEN}✅ Variables de entorno cargadas${NC}"
else
    echo -e "${RED}❌ Archivo env no encontrado en $SCRIPT_DIR${NC}"
    exit 1
fi

# Verificar que DATABASE_URL esté configurado
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no está configurado${NC}"
    exit 1
fi

echo ""
echo "📊 Aplicando migración de base de datos..."
echo ""

# Ejecutar migración SQL
psql "$DATABASE_URL" << 'EOF'
-- Agregar constraint único a table_modifications para soportar ON CONFLICT
-- Este constraint permite que la operación ON CONFLICT funcione correctamente

-- Primero, eliminar registros duplicados si existen
DELETE FROM table_modifications a USING table_modifications b
WHERE a.id > b.id
  AND a.table_id = b.table_id
  AND a.reservation_id = b.reservation_id;

-- Crear el constraint único
ALTER TABLE table_modifications 
DROP CONSTRAINT IF EXISTS table_modifications_table_reservation_unique;

ALTER TABLE table_modifications 
ADD CONSTRAINT table_modifications_table_reservation_unique 
UNIQUE (table_id, reservation_id);

-- Verificar que el constraint se creó correctamente
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conname = 'table_modifications_table_reservation_unique';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migración de base de datos aplicada exitosamente${NC}"
else
    echo -e "${RED}❌ Error al aplicar la migración de base de datos${NC}"
    exit 1
fi

echo ""
echo "🔄 Reiniciando servidor..."
pm2 restart all

echo ""
echo -e "${GREEN}✅ Correcciones aplicadas exitosamente${NC}"
echo ""
echo "📋 Cambios aplicados:"
echo "  1. ✅ Corregido error al dividir mesas (ON CONFLICT)"
echo "  2. ✅ Agregada validación de capacidad al agrupar mesas"
echo "  3. ✅ Sistema ofrece ampliar capacidad automáticamente cuando se excede"
echo ""
echo "🎉 ¡Todo listo! Puedes probar las funcionalidades de agrupar y dividir mesas."
