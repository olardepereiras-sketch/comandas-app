#!/bin/bash

echo "🚀 ARREGLANDO CALENDARIO - ABRIR/CERRAR DÍAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
DB_PASSWORD="MiContrasenaSegura666"
DB_USER="reservamesa_user"
DB_NAME="reservamesa"

echo ""
echo "📋 Paso 1: Verificando variables de entorno..."
if ! grep -q "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}" .env; then
    echo -e "${YELLOW}⚠️ Actualizando DATABASE_URL en .env${NC}"
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}|" .env
fi
echo -e "${GREEN}✅ Variables verificadas${NC}"

echo ""
echo "📋 Paso 2: Matando procesos del servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo -e "${GREEN}✅ Procesos eliminados${NC}"

echo ""
echo "📋 Paso 3: Iniciando servidor backend..."
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}✅ Servidor iniciado con PID: $SERVER_PID${NC}"

echo ""
echo "📋 Paso 4: Esperando que el servidor inicie (5 segundos)..."
sleep 5

echo ""
echo "📋 Paso 5: Verificando logs del servidor..."
if tail -20 backend.log | grep -q "Servidor corriendo"; then
    echo -e "${GREEN}✅ Servidor iniciado correctamente${NC}"
else
    echo -e "${RED}❌ Servidor no inició correctamente. Últimas 20 líneas del log:${NC}"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ SISTEMA ARREGLADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Para ver los logs en tiempo real:"
echo "   tail -f backend.log"
echo ""
echo "📝 INSTRUCCIONES:"
echo "   1. Ve a https://quieromesa.com/restaurant/reservations-pro"
echo "   2. Haz click en cualquier día cerrado del calendario"
echo "   3. Presiona 'Abrir día'"
echo "   4. El día debería abrirse inmediatamente"
echo "   5. Para agregar turnos, presiona 'Turnos para Hoy'"
echo ""
