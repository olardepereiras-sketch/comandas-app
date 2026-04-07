#!/bin/bash

echo "🔧 ARREGLO DEFINITIVO DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Matar TODOS los procesos de postgres
echo ""
echo "📋 Paso 1: Limpiando procesos..."
sudo pkill -9 postgres 2>/dev/null || true
sleep 2

# Paso 2: Eliminar archivos de bloqueo
echo "📋 Paso 2: Eliminando archivos de bloqueo..."
sudo rm -f /var/lib/postgresql/14/main/postmaster.pid
sudo rm -f /var/run/postgresql/.s.PGSQL.5432*
sudo rm -f /tmp/.s.PGSQL.5432*

# Paso 3: Verificar y arreglar permisos
echo "📋 Paso 3: Verificando permisos..."
sudo chown -R postgres:postgres /var/lib/postgresql/14/main
sudo chmod 700 /var/lib/postgresql/14/main

# Paso 4: Iniciar con pg_ctl directamente
echo "📋 Paso 4: Iniciando PostgreSQL con pg_ctl..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log

# Esperar 5 segundos
sleep 5

# Paso 5: Verificar que está corriendo
echo ""
echo "📋 Paso 5: Verificando estado..."
if sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl status -D /var/lib/postgresql/14/main; then
    echo ""
    echo "✅ PostgreSQL INICIADO CORRECTAMENTE"
    
    # Paso 6: Verificar base de datos
    echo ""
    echo "📋 Paso 6: Verificando base de datos..."
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
        echo "✅ Base de datos reservamesa_db existe"
    else
        echo "⚠️ Creando base de datos reservamesa_db..."
        sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
        sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'Mariano1985*';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ POSTGRESQL FUNCIONANDO CORRECTAMENTE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ ERROR: PostgreSQL no pudo iniciar"
    echo "Ver logs: sudo tail -50 /var/log/postgresql/postgresql-14-main.log"
    exit 1
fi
