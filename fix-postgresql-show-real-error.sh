#!/bin/bash

echo "🔍 DIAGNÓSTICO REAL - MOSTRANDO ERROR ESPECÍFICO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📋 Paso 1: Limpiando procesos..."
sudo pkill -9 postgres 2>/dev/null || true
sudo pkill -9 psql 2>/dev/null || true
sleep 3
sudo rm -f /var/lib/postgresql/14/main/postmaster.pid 2>/dev/null || true
sudo rm -f /var/run/postgresql/.s.PGSQL.* 2>/dev/null || true
echo -e "${GREEN}✅ Procesos eliminados${NC}"
echo ""

echo "📋 Paso 2: Creando log limpio..."
sudo rm -f /var/log/postgresql/postgresql-14-main.log
sudo touch /var/log/postgresql/postgresql-14-main.log
sudo chown postgres:postgres /var/log/postgresql/postgresql-14-main.log
sudo chmod 644 /var/log/postgresql/postgresql-14-main.log
echo -e "${GREEN}✅ Log limpio creado${NC}"
echo ""

echo "📋 Paso 3: Verificando y arreglando permisos..."
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main
sudo chown -R postgres:postgres /var/run/postgresql
sudo chmod 2775 /var/run/postgresql
echo -e "${GREEN}✅ Permisos arreglados${NC}"
echo ""

echo "📋 Paso 4: Verificando integridad del cluster..."
echo "Versión del cluster:"
cat /var/lib/postgresql/14/main/PG_VERSION
echo ""

echo "Verificando archivos críticos:"
if [ ! -f /var/lib/postgresql/14/main/PG_VERSION ]; then
    echo -e "${RED}❌ PG_VERSION falta - cluster corrupto${NC}"
    echo "SOLUCIÓN: Necesitas reinicializar el cluster"
    exit 1
fi

if [ ! -d /var/lib/postgresql/14/main/base ]; then
    echo -e "${RED}❌ Directorio base/ falta - cluster corrupto${NC}"
    echo "SOLUCIÓN: Necesitas reinicializar el cluster"
    exit 1
fi

if [ ! -d /var/lib/postgresql/14/main/global ]; then
    echo -e "${RED}❌ Directorio global/ falta - cluster corrupto${NC}"
    echo "SOLUCIÓN: Necesitas reinicializar el cluster"
    exit 1
fi

echo -e "${GREEN}✅ Archivos críticos presentes${NC}"
echo ""

echo "📋 Paso 5: Verificando configuración..."
if [ ! -f /etc/postgresql/14/main/postgresql.conf ]; then
    echo -e "${RED}❌ postgresql.conf falta${NC}"
    exit 1
fi

if [ ! -f /etc/postgresql/14/main/pg_hba.conf ]; then
    echo -e "${RED}❌ pg_hba.conf falta${NC}"
    exit 1
fi

echo "Verificando listen_addresses en postgresql.conf:"
sudo grep "listen_addresses" /etc/postgresql/14/main/postgresql.conf | grep -v "^#" || echo "No configurado (usará default)"
echo ""

echo "Verificando port en postgresql.conf:"
sudo grep "^port" /etc/postgresql/14/main/postgresql.conf || echo "No configurado (usará 5432)"
echo ""

echo -e "${GREEN}✅ Archivos de configuración OK${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 INTENTANDO INICIAR POSTGRESQL CON DIAGNÓSTICO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Intentar iniciar con pg_ctl para ver el error exacto
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start \
    -D /var/lib/postgresql/14/main \
    -l /var/log/postgresql/postgresql-14-main.log \
    -o "-c config_file=/etc/postgresql/14/main/postgresql.conf"

RESULT=$?
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ POSTGRESQL INICIADO CORRECTAMENTE${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Verificar que realmente está corriendo
    if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL responde a consultas${NC}"
        echo ""
        
        # Verificar/crear base de datos
        echo "📋 Verificando base de datos reservamesa_db..."
        if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
            echo -e "${GREEN}✅ Base de datos existe${NC}"
        else
            echo -e "${YELLOW}⚠️ Creando base de datos...${NC}"
            sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
            sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
            sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"
            echo -e "${GREEN}✅ Base de datos creada${NC}"
        fi
        echo ""
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${GREEN}🎉 POSTGRESQL FUNCIONANDO CORRECTAMENTE${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Siguiente paso: ./setup-backups-automaticos.sh"
        exit 0
    else
        echo -e "${RED}❌ PostgreSQL inició pero no responde${NC}"
        RESULT=1
    fi
fi

if [ $RESULT -ne 0 ]; then
    echo -e "${RED}❌ ERROR AL INICIAR POSTGRESQL${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "CONTENIDO COMPLETO DEL LOG DE ERROR:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat /var/log/postgresql/postgresql-14-main.log
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "INFORMACIÓN DEL SISTEMA:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Espacio en disco:"
    df -h /var/lib/postgresql
    echo ""
    echo "Permisos del directorio de datos:"
    ls -la /var/lib/postgresql/14/main | head -15
    echo ""
    
    # Intentar iniciar en modo debug para ver más detalles
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "INTENTANDO INICIAR EN MODO DEBUG:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    sudo -u postgres /usr/lib/postgresql/14/bin/postgres \
        -D /var/lib/postgresql/14/main \
        -c config_file=/etc/postgresql/14/main/postgresql.conf \
        --single &
    sleep 5
    sudo pkill -9 postgres
    echo ""
    
    exit 1
fi
