#!/bin/bash
# Script de deploy automático para VPS
# Ejecutar desde el VPS: bash vps-deploy-script.sh

# No usar set -e para manejar errores manualmente

echo "🚀 INICIANDO DEPLOY DE RESERVAMESA"
echo "=================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Directorio del proyecto
PROJECT_DIR="/var/www/reservamesa"

# Verificar que estamos en el directorio correcto
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Error: Directorio $PROJECT_DIR no existe${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "\n${YELLOW}📋 PASO 1: Deteniendo servicios...${NC}"
pkill -f "bun backend/server.ts" || true
pkill -f "python3 -m http.server" || true
echo -e "${GREEN}✅ Servicios detenidos${NC}"

echo -e "\n${YELLOW}📋 PASO 2: Limpiando builds antiguos...${NC}"
rm -rf dist .expo node_modules/.cache
echo -e "${GREEN}✅ Builds limpiados${NC}"

echo -e "\n${YELLOW}📋 PASO 3: Verificando dependencias...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Error: Bun no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Bun disponible${NC}"

echo -e "\n${YELLOW}📋 PASO 4: Instalando dependencias...${NC}"
bun install --frozen-lockfile 2>&1 | grep -v "warn:" || true
echo -e "${GREEN}✅ Dependencias instaladas${NC}"

echo -e "\n${YELLOW}📋 PASO 5: Verificando tRPC v10...${NC}"
TRPC_VERSION=$(bun list 2>/dev/null | grep "@trpc/server@" | head -1 || echo "not found")
if [[ "$TRPC_VERSION" == *"10.45.2"* ]]; then
    echo -e "${GREEN}✅ tRPC v10.45.2 confirmado${NC}"
else
    echo -e "${YELLOW}⚠️  Reinstalando tRPC v10...${NC}"
    bun remove @trpc/client @trpc/react-query @trpc/server
    bun add @trpc/client@10.45.2 @trpc/react-query@10.45.2 @trpc/server@10.45.2
    echo -e "${GREEN}✅ tRPC v10.45.2 instalado${NC}"
fi

echo -e "\n${YELLOW}📋 PASO 6: Verificando PostgreSQL...${NC}"
if ! systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ Error: PostgreSQL no está corriendo${NC}"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL activo${NC}"

echo -e "\n${YELLOW}📋 PASO 7: Reconstruyendo frontend...${NC}"
echo "   (Esto puede tardar 1-2 minutos)"
CI=1 EXPO_PUBLIC_RORK_API_BASE_URL=http://200.234.236.133 bunx expo export --platform web --output-dir dist --clear > /tmp/expo-build.log 2>&1
BUILD_STATUS=$?
if [ $BUILD_STATUS -ne 0 ] || [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ Error: Build de frontend falló${NC}"
    echo "Ver logs en: /tmp/expo-build.log"
    tail -20 /tmp/expo-build.log
    exit 1
fi
echo -e "${GREEN}✅ Frontend reconstruido${NC}"

echo -e "\n${YELLOW}📋 PASO 8: Iniciando backend...${NC}"
rm -f backend.log
nohup bun --env-file .env backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID del backend: $BACKEND_PID"

# Esperar a que backend esté listo
echo "   Esperando que backend inicie..."
sleep 5

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Error: Backend falló al iniciar${NC}"
    echo "Últimas 30 líneas del log:"
    tail -30 backend.log
    exit 1
fi

# Verificar que backend responde
echo "   Verificando conectividad..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend respondiendo en puerto 3000${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${RED}❌ Error: Backend no responde después de 15 intentos${NC}"
        echo "Últimas 30 líneas del log:"
        tail -30 backend.log
        exit 1
    fi
    sleep 2
done

echo -e "\n${YELLOW}📋 PASO 9: Iniciando frontend...${NC}"

# El frontend lo sirve el backend (Bun) en el mismo puerto
echo -e "${GREEN}✅ Frontend integrado en backend (puerto 3000)${NC}"

# Si Nginx está configurado, reiniciarlo
if command -v nginx &> /dev/null && [ -f "/etc/nginx/sites-enabled/reservamesa" ]; then
    echo "   Reiniciando Nginx (proxy)..."
    systemctl restart nginx
    echo -e "${GREEN}✅ Nginx reiniciado${NC}"
fi

echo -e "\n${YELLOW}📋 PASO 10: Verificando endpoints...${NC}"

# Verificar backend
if curl -s http://127.0.0.1:3000/api/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend health check OK${NC}"
else
    echo -e "${RED}❌ Backend health check falló${NC}"
fi

# Verificar frontend
if curl -s http://127.0.0.1/ | grep -q "<!DOCTYPE html>"; then
    echo -e "${GREEN}✅ Frontend accesible${NC}"
else
    echo -e "${RED}❌ Frontend no accesible${NC}"
fi

echo -e "\n${GREEN}🎉 DEPLOY COMPLETADO${NC}"
echo "=================================="
echo -e "\n📊 URLs disponibles:"
echo "   • Frontend: http://200.234.236.133/"
echo "   • Admin: http://200.234.236.133/admin"
echo "   • API: http://200.234.236.133/api/health"
echo "   • tRPC: http://200.234.236.133/api/trpc"
echo ""
echo "📋 Ver logs:"
echo "   • Backend: tail -f $PROJECT_DIR/backend.log"
echo ""
echo "🔍 Verificar procesos:"
echo "   • ps aux | grep -E 'bun|nginx'"
echo ""
echo "🔄 Backend PID: $BACKEND_PID"
echo ""
echo "💡 Próximos pasos:"
echo "   1. Acceder a http://200.234.236.133/admin"
echo "   2. Crear provincias y ciudades en 'Ubicaciones'"
echo "   3. Crear planes de suscripción en 'Suscripciones'"
echo "   4. Crear tu primer restaurante"
echo ""
