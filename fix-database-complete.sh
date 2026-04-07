#!/bin/bash

echo "🔧 Configuración completa de PostgreSQL..."
echo ""

DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"

echo "📋 Paso 1: Verificando base de datos..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo "❌ Base de datos '$DB_NAME' no existe. Creándola..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    echo "✅ Base de datos '$DB_NAME' creada"
else
    echo "✅ Base de datos '$DB_NAME' ya existe"
fi

echo ""
echo "📋 Paso 2: Otorgando permisos..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO $DB_USER;"
echo "✅ Permisos otorgados"

echo ""
echo "📋 Paso 3: Verificando conexión..."
export PGPASSWORD="$DB_PASSWORD"
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa a PostgreSQL"
else
    echo "❌ Error al conectar. Verifica la contraseña."
    exit 1
fi
unset PGPASSWORD

echo ""
echo "📋 Paso 4: Inicializando tablas si es necesario..."
cd /var/www/reservamesa
if [ ! -f "backend/db/init-complete-schema.ts" ]; then
    echo "⚠️ Script de inicialización no encontrado"
else
    echo "🔧 Ejecutando migración de schema..."
    bun backend/db/init-complete-schema.ts
fi

echo ""
echo "📋 Paso 5: Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifica los logs con:"
echo "  tail -f /var/www/reservamesa/backend.log"
echo ""
