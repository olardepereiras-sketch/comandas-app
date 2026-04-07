#!/bin/bash

echo "🔧 Unificando configuración de base de datos..."

DB_NAME="reservamesa_db"
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"

echo ""
echo "📋 Paso 1: Verificando si la base de datos existe..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo "⚠️  Base de datos '$DB_NAME' no existe. Creándola..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
    echo "✅ Base de datos '$DB_NAME' creada"
else
    echo "✅ Base de datos '$DB_NAME' ya existe"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
fi

echo ""
echo "📋 Paso 2: Actualizando archivo env..."
cp env env.backup.$(date +%Y%m%d_%H%M%S)

cat > env << EOF
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
EXPO_PUBLIC_API_URL=https://quieromesa.com

PORT=3000

# ===========================================
# BASE DE DATOS POSTGRESQL
# ===========================================
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

NODE_ENV=production

EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

HOST=0.0.0.0

# ===========================================
# RESEND EMAIL SERVICE
# ===========================================
RESEND_API_KEY=re_5qv8LwMe_MA9V47G6dnob8FgtwvBj6iBG

# ===========================================
# TWILIO WHATSAPP SERVICE
# ===========================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
EOF

echo "✅ Archivo env actualizado"

echo ""
echo "📋 Paso 3: Verificando conexión..."
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

if PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa a la base de datos"
else
    echo "❌ Error: No se puede conectar a la base de datos"
    exit 1
fi

echo ""
echo "📋 Paso 4: Deteniendo servidor actual..."
pkill -f "bun backend/server.ts" || true
sleep 2

echo ""
echo "📋 Paso 5: Iniciando servidor con nueva configuración..."
cd /var/www/reservamesa
export $(cat env | grep -v '^#' | xargs)
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!

echo "✅ Servidor iniciado (PID: $SERVER_PID)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Configuración aplicada:"
echo "   • Base de datos: $DB_NAME"
echo "   • Usuario: $DB_USER"
echo "   • Host: localhost:5432"
echo ""
echo "🔍 Para ver los logs del servidor:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔄 Para reiniciar el servidor:"
echo "   pkill -f 'bun backend/server.ts' && cd /var/www/reservamesa && export \$(cat env | grep -v '^#' | xargs) && nohup bun backend/server.ts > backend.log 2>&1 &"
echo ""
