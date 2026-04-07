#!/bin/bash

echo "🚨 REPARACIÓN COMPLETA Y DEFINITIVA DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "📋 Paso 1: Matando TODOS los procesos zombies de PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo pkill -9 postgres 2>/dev/null || true
sudo pkill -9 psql 2>/dev/null || true
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 2: Limpiando archivos de lock..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo rm -f /var/run/postgresql/.s.PGSQL.5432* 2>/dev/null || true
sudo rm -f /var/lib/postgresql/14/main/postmaster.pid 2>/dev/null || true
echo "✅ Archivos de lock eliminados"

echo ""
echo "📋 Paso 3: Verificando permisos del directorio de datos..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main
echo "✅ Permisos corregidos"

echo ""
echo "📋 Paso 4: Verificando configuración de PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup de la configuración actual
sudo cp /etc/postgresql/14/main/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf.bak 2>/dev/null || true

# Configurar pg_hba.conf correctamente
sudo bash -c 'cat > /etc/postgresql/14/main/pg_hba.conf' << 'EOF'
# PostgreSQL Client Authentication Configuration File
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5
EOF

echo "✅ Configuración actualizada"

echo ""
echo "📋 Paso 5: Iniciando PostgreSQL cluster..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sudo pg_ctlcluster 14 main start 2>&1

sleep 3

echo ""
echo "📋 Paso 6: Verificando que PostgreSQL está corriendo..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if sudo pg_lsclusters | grep "14.*main.*online"; then
    echo -e "${GREEN}✅ PostgreSQL está CORRIENDO${NC}"
else
    echo -e "${RED}❌ PostgreSQL NO está corriendo. Mostrando error real:${NC}"
    echo ""
    sudo journalctl -xeu postgresql@14-main.service --no-pager -n 30
    echo ""
    echo "Log de PostgreSQL:"
    sudo tail -30 /var/log/postgresql/postgresql-14-main.log
    exit 1
fi

echo ""
echo "📋 Paso 7: Probando conexión..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
else
    echo -e "${RED}❌ No se puede conectar${NC}"
    exit 1
fi

echo ""
echo "📋 Paso 8: Verificando/creando base de datos reservamesa_db..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
    echo "✅ Base de datos existe"
else
    echo "📝 Creando base de datos..."
    sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
    echo "✅ Base de datos creada"
fi

echo ""
echo "📋 Paso 9: Verificando/creando usuario reservamesa_user..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Cargar variables de entorno
if [ -f "env" ]; then
    export $(grep -v '^#' env | grep DATABASE_PASSWORD | xargs)
fi

if [ -z "$DATABASE_PASSWORD" ]; then
    echo -e "${RED}❌ DATABASE_PASSWORD no encontrada en archivo env${NC}"
    exit 1
fi

# Verificar si el usuario existe
if sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'reservamesa_user'" | grep -q 1; then
    echo "✅ Usuario existe, actualizando contraseña..."
    sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD '$DATABASE_PASSWORD';"
else
    echo "📝 Creando usuario..."
    sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD '$DATABASE_PASSWORD';"
fi

echo "📝 Otorgando permisos..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL ON SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"

echo "✅ Usuario configurado correctamente"

echo ""
echo "📋 Paso 10: Probando conexión con reservamesa_user..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
export PGPASSWORD="$DATABASE_PASSWORD"
if psql -U reservamesa_user -h localhost -d reservamesa_db -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión con reservamesa_user EXITOSA${NC}"
else
    echo -e "${RED}❌ No se puede conectar con reservamesa_user${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ POSTGRESQL COMPLETAMENTE ARREGLADO Y FUNCIONANDO${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
