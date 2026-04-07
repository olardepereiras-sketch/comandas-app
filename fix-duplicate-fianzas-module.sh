#!/bin/bash

echo "🔧 Eliminando módulo duplicado de fianzas..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuración de base de datos
DB_NAME="reservas_db"
DB_USER="reservas_user"

echo "📋 Verificando módulos de fianzas..."
sudo -u postgres psql -d "$DB_NAME" -c "SELECT id, name, route, is_active FROM modules WHERE name = 'Fianzas';"

echo ""
echo "🗑️  Eliminando módulo 'fianzas' duplicado..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
BEGIN;

-- Eliminar referencias en subscription_plan_modules
DELETE FROM subscription_plan_modules WHERE module_id = 'fianzas';

-- Eliminar el módulo 'fianzas'
DELETE FROM modules WHERE id = 'fianzas';

COMMIT;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Módulo duplicado eliminado exitosamente${NC}"
else
    echo -e "${RED}❌ Error al eliminar el módulo duplicado${NC}"
    exit 1
fi

echo ""
echo "📊 Verificando módulos restantes..."
sudo -u postgres psql -d "$DB_NAME" -c "SELECT id, name, route, is_active FROM modules WHERE name = 'Fianzas';"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "📝 Resultado:"
echo "   • Módulo 'fianzas' eliminado"
echo "   • Solo queda el módulo 'deposits' activo"
