#!/bin/bash

echo "🔧 Solucionando autenticación PostgreSQL..."
echo ""

DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_PASSWORD="MiContrasenaSegura666"

echo "📋 Paso 1: Verificando que PostgreSQL está corriendo..."
if ! sudo systemctl is-active --quiet postgresql; then
    echo "⚠️  PostgreSQL no está corriendo. Iniciando..."
    sudo systemctl start postgresql
    sleep 2
fi
echo "✅ PostgreSQL está corriendo"
echo ""

echo "📋 Paso 2: Eliminando usuario y base de datos anteriores..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
echo "✅ Limpieza completada"
echo ""

echo "📋 Paso 3: Creando usuario de PostgreSQL..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
if [ $? -eq 0 ]; then
    echo "✅ Usuario $DB_USER creado"
else
    echo "❌ Error creando usuario"
    exit 1
fi
echo ""

echo "📋 Paso 4: Creando base de datos..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
if [ $? -eq 0 ]; then
    echo "✅ Base de datos $DB_NAME creada"
else
    echo "❌ Error creando base de datos"
    exit 1
fi
echo ""

echo "📋 Paso 5: Otorgando permisos..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
echo "✅ Permisos otorgados"
echo ""

echo "📋 Paso 6: Verificando conexión..."
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión. Verificando configuración de pg_hba.conf..."
    
    # Encontrar el archivo pg_hba.conf
    PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | xargs)
    echo "📁 Archivo pg_hba.conf en: $PG_HBA"
    
    # Verificar si tiene la configuración correcta
    if ! sudo grep -q "^host.*$DB_NAME.*$DB_USER.*md5" "$PG_HBA" && \
       ! sudo grep -q "^local.*all.*all.*trust" "$PG_HBA"; then
        echo "⚠️  Ajustando pg_hba.conf..."
        
        # Hacer backup
        sudo cp "$PG_HBA" "${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Agregar regla para el usuario
        echo "host    $DB_NAME    $DB_USER    127.0.0.1/32    md5" | sudo tee -a "$PG_HBA"
        
        # Recargar configuración
        sudo systemctl reload postgresql
        sleep 2
        
        echo "✅ Configuración actualizada"
    fi
    
    # Intentar nuevamente
    if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Conexión exitosa después de ajustes"
    else
        echo "❌ Aún hay problemas de conexión"
        exit 1
    fi
fi
echo ""

echo "📋 Paso 7: Inicializando schema de base de datos..."
cd /var/www/reservamesa
bun backend/db/init-complete-schema.ts
echo ""

echo "📋 Paso 8: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
sleep 3
echo "✅ Servidor reiniciado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Información de la configuración:"
echo "   Usuario: $DB_USER"
echo "   Base de datos: $DB_NAME"
echo "   Host: localhost"
echo "   Puerto: 5432"
echo ""
echo "Para ver los logs:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
