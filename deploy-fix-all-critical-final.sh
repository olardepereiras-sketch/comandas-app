#!/bin/bash

echo "🚀 ARREGLANDO TODOS LOS PROBLEMAS CRÍTICOS - VERSIÓN FINAL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Directorio del proyecto
PROJECT_DIR="/var/www/reservamesa"
cd $PROJECT_DIR

echo "📋 Paso 1: Sincronizando credenciales de PostgreSQL..."
PASSWORD="MiContrasenaSegura666"

# Resetear contraseña
sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD '$PASSWORD';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contraseña de PostgreSQL actualizada${NC}"
else
    echo -e "${RED}❌ Error actualizando contraseña de PostgreSQL${NC}"
    exit 1
fi

# Actualizar archivo env
DB_URL="postgresql://reservamesa_user:${PASSWORD}@localhost:5432/reservamesa_db"

if grep -q "^DATABASE_URL=" "$PROJECT_DIR/env"; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$PROJECT_DIR/env"
else
    echo "DATABASE_URL=$DB_URL" >> "$PROJECT_DIR/env"
fi

if grep -q "^EXPO_PUBLIC_RORK_DB_ENDPOINT=" "$PROJECT_DIR/env"; then
    sed -i "s|^EXPO_PUBLIC_RORK_DB_ENDPOINT=.*|EXPO_PUBLIC_RORK_DB_ENDPOINT=$DB_URL|" "$PROJECT_DIR/env"
else
    echo "EXPO_PUBLIC_RORK_DB_ENDPOINT=$DB_URL" >> "$PROJECT_DIR/env"
fi

echo -e "${GREEN}✅ Archivo env actualizado${NC}"
echo ""

echo "📋 Paso 2: Verificando conexión a PostgreSQL..."
if sudo -u postgres psql -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión a PostgreSQL exitosa${NC}"
else
    echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
    exit 1
fi
echo ""

echo "📋 Paso 3: Ejecutando arreglos del schema..."
cd $PROJECT_DIR
bun run backend/db/fix-all-critical-complete.ts

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error ejecutando arreglos del schema${NC}"
    exit 1
fi
echo ""

echo "📋 Paso 4: Deteniendo procesos del backend..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
pkill -f "node.*backend/server" 2>/dev/null
sleep 3
echo -e "${GREEN}✅ Procesos detenidos${NC}"
echo ""

echo "📋 Paso 5: Iniciando servidor backend..."
nohup bun run backend/server.ts > $PROJECT_DIR/backend.log 2>&1 &
PID=$!

if ps -p $PID > /dev/null; then
    echo -e "${GREEN}✅ Servidor iniciado con PID: $PID${NC}"
    
    echo "⏳ Esperando a que el servidor inicie (10 segundos)..."
    sleep 10
    
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}✅ Servidor corriendo correctamente${NC}"
    else
        echo -e "${RED}❌ El servidor se detuvo inesperadamente${NC}"
        echo "📋 Log:"
        tail -n 50 $PROJECT_DIR/backend.log
        exit 1
    fi
else
    echo -e "${RED}❌ Error al iniciar el servidor${NC}"
    exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Aplicación: https://quieromesa.com"
echo "📝 Logs: tail -f /var/www/reservamesa/backend.log"
echo ""
