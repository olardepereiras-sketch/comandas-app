#!/bin/bash

echo "🚀 DEPLOY FINAL DE RESERVAMESA"
echo "==============================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Detener servicios
echo "📋 PASO 1: Deteniendo servicios..."
pkill -f bun 2>/dev/null || true
pm2 delete all 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Servicios detenidos${NC}"
echo ""

# 2. Limpiar completamente
echo "📋 PASO 2: Limpiando proyecto..."
rm -rf node_modules
rm -rf dist
rm -rf .expo
rm -f bun.lock
echo -e "${GREEN}✅ Proyecto limpiado${NC}"
echo ""

# 3. Instalar dependencias
echo "📋 PASO 3: Instalando dependencias..."
echo "   (Esto puede tardar 1-2 minutos)"
bun install 2>&1 | tail -10
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${RED}❌ Error al instalar dependencias${NC}"
    exit 1
fi
echo ""

# 4. Verificar tRPC
echo "📋 PASO 4: Verificando tRPC..."
TRPC_VERSION=$(bun pm ls @trpc/server 2>/dev/null | grep @trpc/server | head -1)
echo "   $TRPC_VERSION"
echo ""

# 5. Verificar PostgreSQL y DB
echo "📋 PASO 5: Verificando base de datos..."
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ PostgreSQL no está activo${NC}"
    exit 1
fi

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='reservamesa_db'" 2>/dev/null)
if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${RED}❌ Base de datos no existe${NC}"
    exit 1
fi

PROVINCE_COUNT=$(sudo -u postgres psql -d reservamesa_db -tAc "SELECT COUNT(*) FROM provinces" 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Base de datos OK (Provincias: $PROVINCE_COUNT)${NC}"
echo ""

# 6. Exportar frontend
echo "📋 PASO 6: Exportando frontend..."
echo "   (Esto puede tardar 2-3 minutos)"
bunx expo export --platform web --output-dir dist 2>&1 | grep -E "(Exported|Files|Error)" || true

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: directorio dist no creado${NC}"
    exit 1
fi

# Verificar que index.html existe
if [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ Error: dist/index.html no existe${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend exportado${NC}"
echo ""

# 7. Iniciar backend
echo "📋 PASO 7: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"
sleep 5
echo ""

# 8. Verificar backend
echo "📋 PASO 8: Verificando backend..."
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}❌ Backend no está corriendo${NC}"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

# Probar health check
for i in {1..3}; do
    HEALTH=$(curl -s http://127.0.0.1:3000/api/health 2>/dev/null | grep -o '"status":"ok"' || echo "")
    if [ -n "$HEALTH" ]; then
        echo -e "${GREEN}✅ Backend funcionando correctamente${NC}"
        break
    fi
    if [ $i -eq 3 ]; then
        echo -e "${YELLOW}⚠️  Health check no responde${NC}"
    fi
    sleep 2
done
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOY COMPLETADO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLs:"
echo "   http://200.234.236.133"
echo "   http://200.234.236.133/admin/locations"
echo ""
echo "📊 Comandos útiles:"
echo "   Ver logs:     tail -f backend.log"
echo "   Reiniciar:    pkill -f bun && bash deploy-vps-final.sh"
echo "   Detener:      pkill -f bun"
echo ""
