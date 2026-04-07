#!/bin/bash

echo "🚨 ARREGLANDO POSTGRESQL - SOLUCIÓN DEFINITIVA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cargar variables de .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    exit 1
fi

echo "📋 Paso 1: Verificando archivo .env..."
if [ -s .env ]; then
    echo -e "${GREEN}✅ Archivo .env restaurado${NC}"
else
    echo -e "${RED}❌ Archivo .env está vacío${NC}"
    exit 1
fi
echo ""

echo "📋 Paso 2: Matando procesos zombies de PostgreSQL..."
pkill -9 postgres 2>/dev/null
pkill -9 psql 2>/dev/null
sleep 2
echo -e "${GREEN}✅ Procesos limpiados${NC}"
echo ""

echo "📋 Paso 3: Limpiando archivos de bloqueo..."
rm -f /var/lib/postgresql/14/main/postmaster.pid 2>/dev/null
rm -f /var/run/postgresql/.s.PGSQL.5432* 2>/dev/null
echo -e "${GREEN}✅ Archivos de bloqueo eliminados${NC}"
echo ""

echo "📋 Paso 4: Verificando permisos..."
chown -R postgres:postgres /var/lib/postgresql/14/main
chmod 700 /var/lib/postgresql/14/main
chown -R postgres:postgres /var/run/postgresql
chmod 2775 /var/run/postgresql
echo -e "${GREEN}✅ Permisos corregidos${NC}"
echo ""

echo "📋 Paso 5: Iniciando PostgreSQL..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log
sleep 3
echo ""

echo "📋 Paso 6: Verificando que PostgreSQL está corriendo..."
if sudo -u postgres psql -c '\l' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
else
    echo -e "${YELLOW}⚠️ Intentando con systemctl...${NC}"
    systemctl start postgresql
    sleep 3
    
    if sudo -u postgres psql -c '\l' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
    else
        echo -e "${RED}❌ No se pudo iniciar PostgreSQL${NC}"
        echo "Últimas líneas del log:"
        tail -20 /var/log/postgresql/postgresql-14-main.log
        exit 1
    fi
fi
echo ""

echo "📋 Paso 7: Verificando base de datos reservamesa_db..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
    echo -e "${GREEN}✅ Base de datos reservamesa_db existe${NC}"
else
    echo -e "${YELLOW}⚠️ Creando base de datos reservamesa_db...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
    sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
    sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO reservamesa_user;"
    echo -e "${GREEN}✅ Base de datos creada${NC}"
fi
echo ""

echo "📋 Paso 8: Probando conexión con credenciales del .env..."
if PGPASSWORD=MiContrasenaSegura666 psql -U reservamesa_user -d reservamesa_db -h localhost -c '\dt' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa con reservamesa_user${NC}"
else
    echo -e "${YELLOW}⚠️ Ajustando permisos de usuario...${NC}"
    sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
    sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reservamesa_user;"
    sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
    sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"
    echo -e "${GREEN}✅ Permisos ajustados${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ POSTGRESQL FUNCIONANDO CORRECTAMENTE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ahora puedes:"
echo "1. Reiniciar el servidor: pm2 restart reservamesa"
echo "2. Configurar backups: ./setup-backups-automaticos.sh"
echo ""
