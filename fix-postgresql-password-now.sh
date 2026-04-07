#!/bin/bash

echo "🔐 ARREGLANDO CREDENCIALES DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Passwords a probar
PASSWORD1="MiContrasenaSegura666"
PASSWORD2="TuPasswordSegura123!"
NEW_PASSWORD="ReservaMesa2026Secure!"

# 1. Verificar si PostgreSQL está corriendo
if ! sudo systemctl is-active --quiet postgresql; then
    echo "📋 PostgreSQL no está corriendo. Iniciando..."
    sudo systemctl start postgresql
    sleep 3
fi

# 2. Probar con la primera contraseña
echo ""
echo "📋 Probando contraseña 1..."
if PGPASSWORD="$PASSWORD1" psql -U reservamesa_user -d reservamesa_db -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Contraseña 1 funciona: $PASSWORD1"
    WORKING_PASSWORD="$PASSWORD1"
else
    echo "❌ Contraseña 1 no funciona"
    
    # 3. Probar con la segunda contraseña
    echo "📋 Probando contraseña 2..."
    if PGPASSWORD="$PASSWORD2" psql -U reservamesa_user -d reservamesa_db -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Contraseña 2 funciona: $PASSWORD2"
        WORKING_PASSWORD="$PASSWORD2"
    else
        echo "❌ Contraseña 2 no funciona"
        echo ""
        echo "📋 Reseteando contraseña a: $NEW_PASSWORD"
        
        # Resetear la contraseña
        sudo -u postgres psql <<EOF
ALTER USER reservamesa_user WITH PASSWORD '$NEW_PASSWORD';
\q
EOF
        
        if [ $? -eq 0 ]; then
            echo "✅ Contraseña reseteada"
            WORKING_PASSWORD="$NEW_PASSWORD"
        else
            echo "❌ Error reseteando contraseña"
            exit 1
        fi
    fi
fi

# 4. Actualizar archivo .env
echo ""
echo "📋 Actualizando archivo .env con la contraseña correcta..."

cat > .env <<EOF
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
EXPO_PUBLIC_API_URL=https://quieromesa.com

PORT=3000

# ===========================================
# BASE DE DATOS POSTGRESQL
# ===========================================
DATABASE_URL=postgresql://reservamesa_user:${WORKING_PASSWORD}@localhost:5432/reservamesa_db

NODE_ENV=production

EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:${WORKING_PASSWORD}@localhost:5432/reservamesa_db

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

echo "✅ Archivo .env actualizado"

# 5. Verificar la conexión
echo ""
echo "📋 Verificando conexión..."
if PGPASSWORD="$WORKING_PASSWORD" psql -U reservamesa_user -d reservamesa_db -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión"
    exit 1
fi

# 6. Reiniciar servidor backend
echo ""
echo "📋 Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PROBLEMA RESUELTO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Contraseña activa: $WORKING_PASSWORD"
echo ""
echo "Verificando logs del backend en 5 segundos..."
sleep 5
echo ""
tail -20 backend.log
