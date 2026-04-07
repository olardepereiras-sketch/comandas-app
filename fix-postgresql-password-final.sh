#!/bin/bash

echo "🔐 ARREGLANDO CONTRASEÑA DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASSWORD="MiContrasenaSegura666"
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"

echo "📋 Paso 1: Cambiando contraseña en PostgreSQL..."
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$PASSWORD';" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Contraseña de PostgreSQL actualizada"
else
    echo "❌ Error al cambiar contraseña"
    exit 1
fi

echo ""
echo "📋 Paso 2: Actualizando archivo .env..."
cat > env << EOF
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
EXPO_PUBLIC_API_URL=https://quieromesa.com

# Puerto del servidor (opcional, por defecto 3000)
PORT=3000

# ===========================================
# BASE DE DATOS POSTGRESQL
# ===========================================
DATABASE_URL=postgresql://$DB_USER:$PASSWORD@localhost:5432/$DB_NAME

# Variables de entorno adicionales para producción
NODE_ENV=production

# Ruta a la base de datos (igual que DATABASE_URL)
EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://$DB_USER:$PASSWORD@localhost:5432/$DB_NAME

# Host del servidor (0.0.0.0 para permitir conexiones externas en VPS)
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

echo ""
echo "📋 Paso 3: Actualizando archivo env.production..."
cat > env.production << EOF
# ============================================
# CONFIGURACIÓN POSTGRESQL - PRODUCCIÓN VPS
# ============================================

# 🌐 URL de la API
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
EXPO_PUBLIC_API_URL=https://quieromesa.com

# 🚀 Puerto del servidor
PORT=3000

# 🗄️ Base de Datos PostgreSQL LOCAL
DATABASE_URL=postgresql://$DB_USER:$PASSWORD@localhost:5432/$DB_NAME

# 🔧 Configuración del servidor
NODE_ENV=production
HOST=0.0.0.0

# 📧 Servicio de correo (Resend API)
RESEND_API_KEY=re_5qv8LwMe_MA9V47G6dnob8FgtwvBj6iBG
EOF

echo "✅ Archivo env.production actualizado"

echo ""
echo "📋 Paso 4: Probando conexión a PostgreSQL..."
PGPASSWORD="$PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión"
    exit 1
fi

echo ""
echo "📋 Paso 5: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts"
sleep 2
cd /var/www/reservamesa
bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONTRASEÑA ACTUALIZADA CORRECTAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Contraseña activa: $PASSWORD"
echo "👤 Usuario: $DB_USER"
echo "🗄️ Base de datos: $DB_NAME"
echo ""
echo "Verificando logs del backend en 5 segundos..."
sleep 5
echo ""
tail -20 backend.log
