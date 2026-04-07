#!/bin/bash
#
# Script de despliegue rápido para VPS con PostgreSQL
# Ejecutar en el VPS: bash deploy-vps.sh
#

set -e

echo "🚀 INICIANDO DESPLIEGUE EN VPS"
echo "================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/var/www/reservamesa"
DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
VPS_IP="200.234.236.133"

# Función de verificación
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 instalado${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 no encontrado${NC}"
        return 1
    fi
}

# 1. Verificar dependencias
echo "📦 Verificando dependencias..."
check_command bun || { echo "Instalar Bun: curl -fsSL https://bun.sh/install | bash"; exit 1; }
check_command pm2 || { echo "Instalar PM2: npm install -g pm2"; exit 1; }
check_command psql || { echo "Instalar PostgreSQL: apt install -y postgresql"; exit 1; }

# 2. Navegar al directorio del proyecto
echo ""
echo "📂 Navegando al directorio del proyecto..."
cd $PROJECT_DIR || { echo "❌ No se encontró el directorio $PROJECT_DIR"; exit 1; }
echo -e "${GREEN}✅ En directorio: $(pwd)${NC}"

# 3. Verificar archivo .env
echo ""
echo "🔍 Verificando archivo .env..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado. Copiando desde env.production...${NC}"
    cp env.production .env
fi

# Verificar DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}❌ Falta DATABASE_URL en .env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Archivo .env configurado${NC}"

# 4. Instalar dependencias
echo ""
echo "📥 Instalando dependencias..."
bun install
echo -e "${GREEN}✅ Dependencias instaladas${NC}"

# 5. Verificar conexión a PostgreSQL
echo ""
echo "🗄️  Verificando conexión a PostgreSQL..."
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✅ Conexión a PostgreSQL exitosa${NC}"
else
    echo -e "${RED}❌ No se pudo conectar a PostgreSQL${NC}"
    echo "Ejecuta manualmente:"
    echo "  sudo -u postgres psql"
    echo "  CREATE DATABASE $DB_NAME;"
    echo "  CREATE USER $DB_USER WITH ENCRYPTED PASSWORD 'TuPasswordSegura123!';"
    echo "  GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    exit 1
fi

# 6. Ejecutar migraciones
echo ""
echo "🔄 Ejecutando migraciones de base de datos..."
bun backend/db/migrations-postgres.ts
echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"

# 7. Verificar si la base de datos está vacía
echo ""
echo "🔍 Verificando datos en la base de datos..."
ADMIN_COUNT=$(psql -h localhost -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM admin_users" 2>/dev/null || echo "0")
ADMIN_COUNT=$(echo $ADMIN_COUNT | xargs) # Trim whitespace

if [ "$ADMIN_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Base de datos vacía. Ejecutando seed...${NC}"
    bun backend/db/seed-postgres.ts
    echo -e "${GREEN}✅ Seed ejecutado${NC}"
else
    echo -e "${GREEN}✅ Base de datos ya contiene datos ($ADMIN_COUNT administradores)${NC}"
fi

# 8. Compilar frontend
echo ""
echo "🔨 Compilando frontend..."
bun run export
echo -e "${GREEN}✅ Frontend compilado en dist/${NC}"

# 9. Reiniciar servidor con PM2
echo ""
echo "🔄 Reiniciando servidor con PM2..."
if pm2 describe reservamesa &> /dev/null; then
    echo "  Servidor ya existe en PM2, reiniciando..."
    pm2 restart reservamesa
else
    echo "  Iniciando servidor por primera vez..."
    pm2 start backend/server.ts --name reservamesa --interpreter bun
fi

pm2 save
echo -e "${GREEN}✅ Servidor reiniciado${NC}"

# 10. Verificar que el servidor esté corriendo
echo ""
echo "🔍 Verificando estado del servidor..."
sleep 2
pm2 status reservamesa

# 11. Prueba de health check
echo ""
echo "🏥 Ejecutando health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if echo $HEALTH_RESPONSE | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✅ Health check exitoso${NC}"
    echo $HEALTH_RESPONSE | jq '.' 2>/dev/null || echo $HEALTH_RESPONSE
else
    echo -e "${RED}❌ Health check falló${NC}"
    echo $HEALTH_RESPONSE
fi

# 12. Resumen
echo ""
echo "================================"
echo -e "${GREEN}🎉 DESPLIEGUE COMPLETADO${NC}"
echo "================================"
echo ""
echo "📍 URLs disponibles:"
echo "   - Frontend: http://$VPS_IP"
echo "   - API: http://$VPS_IP:3000/api"
echo "   - Health: http://$VPS_IP:3000/api/health"
echo "   - Admin: http://$VPS_IP/admin/login"
echo ""
echo "🔑 Credenciales de administrador:"
echo "   Usuario: tono"
echo "   Contraseña: 1234"
echo "   Email 2FA: info@olardepereiras.com"
echo ""
echo "📊 Comandos útiles:"
echo "   - Ver logs: pm2 logs reservamesa"
echo "   - Ver estado: pm2 status"
echo "   - Reiniciar: pm2 restart reservamesa"
echo ""
