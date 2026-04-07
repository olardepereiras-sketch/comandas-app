#!/bin/bash

echo "🚨 ARREGLANDO CAUSA RAÍZ DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Paso 1: Matar TODOS los procesos zombies
echo "📋 Paso 1: Eliminando procesos zombies de postgres..."
pkill -9 -u postgres 2>/dev/null || true
killall -9 postgres 2>/dev/null || true
killall -9 psql 2>/dev/null || true

# Matar procesos específicos que vimos en el diagnóstico
kill -9 486151 486152 486153 486161 486162 2>/dev/null || true

echo "✅ Procesos eliminados"
sleep 2

# Paso 2: Limpiar archivos de bloqueo
echo ""
echo "📋 Paso 2: Limpiando archivos de bloqueo..."
rm -f /var/lib/postgresql/14/main/postmaster.pid 2>/dev/null || true
rm -f /var/run/postgresql/.s.PGSQL.5432* 2>/dev/null || true
rm -f /tmp/.s.PGSQL.5432* 2>/dev/null || true
echo "✅ Archivos de bloqueo eliminados"

# Paso 3: Arreglar directorio /run/postgresql/
echo ""
echo "📋 Paso 3: Arreglando directorio /run/postgresql/..."
mkdir -p /run/postgresql
chown -R postgres:postgres /run/postgresql
chmod 2775 /run/postgresql
echo "✅ Directorio arreglado"

# Paso 4: Verificar permisos del directorio de datos
echo ""
echo "📋 Paso 4: Verificando permisos de datos..."
chown -R postgres:postgres /var/lib/postgresql/14/main
chmod 700 /var/lib/postgresql/14/main
echo "✅ Permisos verificados"

# Paso 5: Verificar configuración de pg_hba.conf
echo ""
echo "📋 Paso 5: Verificando pg_hba.conf..."
if ! grep -q "local.*all.*postgres.*peer" /etc/postgresql/14/main/pg_hba.conf; then
    echo "local   all             postgres                                peer" >> /etc/postgresql/14/main/pg_hba.conf
fi
if ! grep -q "local.*all.*reservamesa_user.*md5" /etc/postgresql/14/main/pg_hba.conf; then
    echo "local   all             reservamesa_user                        md5" >> /etc/postgresql/14/main/pg_hba.conf
fi
echo "✅ Configuración verificada"

# Paso 6: Iniciar PostgreSQL con pg_ctlcluster
echo ""
echo "📋 Paso 6: Iniciando PostgreSQL..."
sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl start -D /var/lib/postgresql/14/main -l /var/log/postgresql/postgresql-14-main.log
sleep 3

# Verificar que inició
if sudo -u postgres /usr/lib/postgresql/14/bin/pg_ctl status -D /var/lib/postgresql/14/main | grep -q "server is running"; then
    echo "✅ PostgreSQL iniciado exitosamente"
else
    echo "⚠️ Intentando con systemctl..."
    systemctl start postgresql@14-main
    sleep 3
fi

# Paso 7: Verificar conexión
echo ""
echo "📋 Paso 7: Verificando conexión..."
if sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ ¡PostgreSQL funciona correctamente!"
    echo ""
    echo "Versión:"
    sudo -u postgres psql -c "SELECT version();"
else
    echo "❌ No se puede conectar. Mostrando últimas líneas del log:"
    tail -20 /var/log/postgresql/postgresql-14-main.log
    exit 1
fi

# Paso 8: Verificar base de datos
echo ""
echo "📋 Paso 8: Verificando base de datos reservamesa_db..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db; then
    echo "✅ Base de datos existe"
else
    echo "⚠️ Base de datos NO existe. Creándola..."
    sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
    sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'Javi2003';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
    sudo -u postgres psql -d reservamesa_db -c "GRANT ALL ON SCHEMA public TO reservamesa_user;"
    echo "✅ Base de datos creada"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ POSTGRESQL ARREGLADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
