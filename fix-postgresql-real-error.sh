#!/bin/bash

echo "🔍 DIAGNOSTICANDO ERROR REAL DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📋 Paso 1: Matando procesos y limpiando..."
sudo pkill -9 postgres 2>/dev/null || true
sudo pkill -9 psql 2>/dev/null || true
sleep 2
sudo rm -f /var/lib/postgresql/14/main/postmaster.pid
sudo rm -f /var/run/postgresql/.s.PGSQL.5432*
echo -e "${GREEN}✅ Limpieza completa${NC}"
echo ""

echo "📋 Paso 2: Respaldando log viejo y creando uno nuevo..."
sudo mv /var/log/postgresql/postgresql-14-main.log /var/log/postgresql/postgresql-14-main.log.old 2>/dev/null || true
sudo touch /var/log/postgresql/postgresql-14-main.log
sudo chown postgres:postgres /var/log/postgresql/postgresql-14-main.log
echo -e "${GREEN}✅ Log nuevo creado${NC}"
echo ""

echo "📋 Paso 3: Verificando permisos críticos..."
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main
sudo chown -R postgres:postgres /var/run/postgresql
sudo chmod 2775 /var/run/postgresql
sudo chown -R postgres:postgres /var/log/postgresql
echo -e "${GREEN}✅ Permisos verificados${NC}"
echo ""

echo "📋 Paso 4: Verificando archivos de configuración..."
if [ ! -f /etc/postgresql/14/main/postgresql.conf ]; then
    echo -e "${RED}❌ postgresql.conf no existe${NC}"
    exit 1
fi
if [ ! -f /etc/postgresql/14/main/pg_hba.conf ]; then
    echo -e "${RED}❌ pg_hba.conf no existe${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Archivos de configuración existen${NC}"
echo ""

echo "📋 Paso 5: Intentando iniciar PostgreSQL..."
echo "Ejecutando: sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log"
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log -w -t 30
RESULT=$?
echo ""

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL INICIADO CORRECTAMENTE${NC}"
    echo ""
    
    echo "📋 Paso 6: Verificando base de datos..."
    sleep 2
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
        echo -e "${GREEN}✅ Base de datos reservamesa_db existe${NC}"
    else
        echo -e "${YELLOW}⚠️ Creando base de datos...${NC}"
        sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
        sudo -u postgres psql -c "CREATE USER IF NOT EXISTS reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
        sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO reservamesa_user;"
        sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
        sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"
        echo -e "${GREEN}✅ Base de datos creada y configurada${NC}"
    fi
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ POSTGRESQL FUNCIONANDO${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Siguiente paso: ./setup-backups-automaticos.sh"
    echo ""
else
    echo -e "${RED}❌ ERROR: PostgreSQL NO PUDO INICIAR${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "ERROR REAL EN EL LOG:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat /var/log/postgresql/postgresql-14-main.log
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "VERIFICANDO CONFIGURACIÓN:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Versión de PostgreSQL:"
    cat /var/lib/postgresql/14/main/PG_VERSION
    echo ""
    echo "Contenido del directorio de datos:"
    ls -la /var/lib/postgresql/14/main/ | head -20
    echo ""
    exit 1
fi
