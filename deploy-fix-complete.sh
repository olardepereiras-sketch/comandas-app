#!/bin/bash

echo "🚀 DEPLOY COMPLETO DE RESERVAMESA"
echo "=================================="
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
echo -e "${GREEN}✅ Servicios detenidos${NC}"
echo ""

# 2. Limpiar node_modules y reinstalar
echo "📋 PASO 2: Limpiando dependencias..."
rm -rf node_modules
rm -f bun.lock
echo -e "${GREEN}✅ Dependencias limpiadas${NC}"
echo ""

# 3. Instalar dependencias desde package.json (tRPC v11)
echo "📋 PASO 3: Instalando dependencias (tRPC v11)..."
bun install --force
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# 4. Verificar versión de tRPC
echo "📋 PASO 4: Verificando versión de tRPC..."
TRPC_VERSION=$(bun pm ls @trpc/server 2>/dev/null | grep @trpc/server | head -1)
echo "   tRPC instalado: $TRPC_VERSION"
echo ""

# 5. Verificar PostgreSQL
echo "📋 PASO 5: Verificando PostgreSQL..."
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL activo${NC}"
else
    echo -e "${RED}❌ PostgreSQL no está activo${NC}"
    exit 1
fi
echo ""

# 6. Verificar base de datos
echo "📋 PASO 6: Verificando base de datos..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='reservamesa_db'")
if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✅ Base de datos existe${NC}"
    PROVINCE_COUNT=$(sudo -u postgres psql -d reservamesa_db -tAc "SELECT COUNT(*) FROM provinces" 2>/dev/null || echo "0")
    echo "   Provincias en DB: $PROVINCE_COUNT"
else
    echo -e "${RED}❌ Base de datos no existe${NC}"
    exit 1
fi
echo ""

# 7. Limpiar builds anteriores
echo "📋 PASO 7: Limpiando builds anteriores..."
rm -rf dist
rm -rf .expo
echo -e "${GREEN}✅ Builds limpiados${NC}"
echo ""

# 8. Exportar frontend con configuración correcta
echo "📋 PASO 8: Exportando frontend..."
echo "   (Esto puede tardar 1-2 minutos)"
EXPO_PUBLIC_RORK_API_BASE_URL=http://200.234.236.133 bunx expo export --platform web --output-dir dist 2>&1 | tail -5
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Frontend exportado correctamente${NC}"
else
    echo -e "${RED}❌ Error al exportar frontend${NC}"
    exit 1
fi
echo ""

# 9. Iniciar backend
echo "📋 PASO 9: Iniciando backend..."
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID del backend: $BACKEND_PID"
sleep 3
echo ""

# 10. Verificar que el backend está corriendo
echo "📋 PASO 10: Verificando backend..."
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✅ Backend corriendo (PID: $BACKEND_PID)${NC}"
    
    # Probar health check
    sleep 2
    HEALTH=$(curl -s http://127.0.0.1:3000/api/health | grep -o '"status":"ok"' || echo "")
    if [ -n "$HEALTH" ]; then
        echo -e "${GREEN}✅ Health check: OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check no responde (normal en primeros segundos)${NC}"
    fi
else
    echo -e "${RED}❌ Backend falló al iniciar${NC}"
    echo "Ver logs:"
    tail -20 backend.log
    exit 1
fi
echo ""

# 11. Resumen final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DEPLOY COMPLETADO EXITOSAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URLS:"
echo "   Frontend:  http://200.234.236.133"
echo "   Admin:     http://200.234.236.133/admin/locations"
echo "   Backend:   http://200.234.236.133/api"
echo "   Health:    http://200.234.236.133/api/health"
echo ""
echo "📊 LOGS:"
echo "   Backend:   tail -f /var/www/reservamesa/backend.log"
echo "   Procesos:  ps aux | grep bun"
echo ""
echo "🔄 COMANDOS ÚTILES:"
echo "   Reiniciar:   pkill -f bun && bash deploy-fix-complete.sh"
echo "   Ver logs:    tail -f backend.log"
echo "   Detener:     pkill -f bun"
echo ""
