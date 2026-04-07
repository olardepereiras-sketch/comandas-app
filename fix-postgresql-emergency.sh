#!/bin/bash

echo "🚨 REPARACIÓN DE EMERGENCIA - POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Paso 1: Ver el error real
echo "📋 Paso 1: Verificando error en logs de PostgreSQL..."
if [ -f "/var/log/postgresql/postgresql-14-main.log" ]; then
    echo "Últimas 20 líneas del log:"
    tail -n 20 /var/log/postgresql/postgresql-14-main.log
    echo ""
fi

# Paso 2: Verificar permisos del directorio de datos
echo "📋 Paso 2: Verificando permisos del directorio de datos..."
DATA_DIR="/var/lib/postgresql/14/main"
if [ -d "$DATA_DIR" ]; then
    OWNER=$(stat -c '%U' "$DATA_DIR")
    PERMS=$(stat -c '%a' "$DATA_DIR")
    echo "Directorio: $DATA_DIR"
    echo "Propietario: $OWNER"
    echo "Permisos: $PERMS"
    
    if [ "$OWNER" != "postgres" ] || [ "$PERMS" != "700" ]; then
        echo -e "${YELLOW}⚠️ Corrigiendo permisos...${NC}"
        sudo chown -R postgres:postgres "$DATA_DIR"
        sudo chmod 700 "$DATA_DIR"
        echo -e "${GREEN}✅ Permisos corregidos${NC}"
    else
        echo -e "${GREEN}✅ Permisos correctos${NC}"
    fi
else
    echo -e "${RED}❌ Directorio de datos no existe. Necesitamos reinicializar el cluster.${NC}"
    echo "🔄 Reinicializando cluster..."
    sudo pg_dropcluster --stop 14 main || true
    sudo pg_createcluster 14 main
    echo -e "${GREEN}✅ Cluster reinicializado${NC}"
fi

# Paso 3: Verificar configuración de PostgreSQL
echo ""
echo "📋 Paso 3: Verificando configuración..."
PG_HBA="/etc/postgresql/14/main/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    echo "Verificando pg_hba.conf..."
    if ! grep -q "local.*all.*postgres.*peer" "$PG_HBA"; then
        echo -e "${YELLOW}⚠️ Añadiendo configuración de autenticación...${NC}"
        sudo bash -c "echo 'local   all   postgres   peer' >> $PG_HBA"
    fi
    if ! grep -q "local.*all.*all.*md5" "$PG_HBA"; then
        echo -e "${YELLOW}⚠️ Añadiendo configuración de autenticación...${NC}"
        sudo bash -c "echo 'local   all   all   md5' >> $PG_HBA"
    fi
    echo -e "${GREEN}✅ Configuración verificada${NC}"
fi

# Paso 4: Intentar iniciar PostgreSQL con diferentes métodos
echo ""
echo "📋 Paso 4: Iniciando PostgreSQL..."

# Método 1: systemctl
sudo systemctl stop postgresql 2>/dev/null || true
sleep 2
sudo systemctl start postgresql

sleep 3

# Verificar si inició
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL iniciado con systemctl${NC}"
else
    echo -e "${YELLOW}⚠️ systemctl no funcionó, intentando con pg_ctlcluster...${NC}"
    
    # Método 2: pg_ctlcluster
    sudo pg_ctlcluster 14 main stop 2>/dev/null || true
    sleep 2
    sudo pg_ctlcluster 14 main start
    
    sleep 3
    
    if sudo pg_ctlcluster 14 main status | grep -q "online"; then
        echo -e "${GREEN}✅ PostgreSQL iniciado con pg_ctlcluster${NC}"
    else
        echo -e "${RED}❌ No se pudo iniciar PostgreSQL${NC}"
        echo "Mostrando errores del log:"
        tail -n 50 /var/log/postgresql/postgresql-14-main.log
        exit 1
    fi
fi

# Paso 5: Verificar conexión
echo ""
echo "📋 Paso 5: Verificando conexión..."
if sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión exitosa${NC}"
    sudo -u postgres psql -c "SELECT version();"
else
    echo -e "${RED}❌ No se puede conectar a PostgreSQL${NC}"
    exit 1
fi

# Paso 6: Verificar/Crear base de datos y usuario
echo ""
echo "📋 Paso 6: Verificando base de datos y usuario..."

# Crear usuario si no existe
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='reservamesa_user'" | grep -q 1; then
    echo "Creando usuario reservamesa_user..."
    sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
    echo -e "${GREEN}✅ Usuario creado${NC}"
else
    echo "Usuario reservamesa_user ya existe"
    # Asegurar que tenga la contraseña correcta
    sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
fi

# Crear base de datos si no existe
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
    echo "Creando base de datos reservamesa_db..."
    sudo -u postgres psql -c "CREATE DATABASE reservamesa_db OWNER reservamesa_user;"
    echo -e "${GREEN}✅ Base de datos creada${NC}"
else
    echo "Base de datos reservamesa_db ya existe"
fi

# Dar permisos
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reservamesa_user;"

echo -e "${GREEN}✅ Permisos otorgados${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ POSTGRESQL REPARADO Y FUNCIONANDO${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
