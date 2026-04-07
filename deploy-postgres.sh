#!/bin/bash

# 🚀 Script Automatizado de Despliegue - PostgreSQL
# Este script despliega tu proyecto al VPS con PostgreSQL

set -e  # Salir si hay algún error

# =====================================================
# CONFIGURACIÓN - EDITA ESTOS VALORES
# =====================================================

VPS_IP="200.234.236.133"
VPS_USER="root"
VPS_PATH="/var/www/reservamesa"
DB_USER="reservamesa_user"
DB_NAME="reservamesa_db"
DB_PASSWORD="TuPasswordSegura123!"  # ⚠️ CAMBIA ESTO

# =====================================================
# NO EDITES DEBAJO DE ESTA LÍNEA
# =====================================================

echo "🚀 Iniciando despliegue a PostgreSQL..."
echo "📍 VPS: $VPS_IP"
echo "📂 Ruta: $VPS_PATH"
echo ""

# 1. Subir archivos al VPS
echo "📤 1/5: Subiendo archivos al VPS..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.expo' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude 'bun.lock' \
  --exclude '*.md' \
  -e "ssh" \
  . $VPS_USER@$VPS_IP:$VPS_PATH/

echo "✅ Archivos subidos"
echo ""

# 2. Configurar PostgreSQL y proyecto en el VPS
echo "🔧 2/5: Configurando PostgreSQL y proyecto..."
ssh $VPS_USER@$VPS_IP << ENDSSH
set -e

echo "📦 Instalando PostgreSQL (si no está instalado)..."
if ! command -v psql &> /dev/null; then
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL instalado"
else
    echo "✅ PostgreSQL ya está instalado"
fi

echo ""
echo "🗄️ Configurando base de datos..."
sudo -u postgres psql << EOPSQL
-- Crear usuario si no existe
DO \\\$\\\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
  END IF;
END\\\$\\\$;

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOPSQL

echo "✅ Base de datos configurada"
echo ""

echo "📝 Creando archivo .env..."
cd $VPS_PATH
cat > .env << 'ENDENV'
EXPO_PUBLIC_RORK_API_BASE_URL=http://$VPS_IP
EXPO_PUBLIC_API_URL=http://$VPS_IP
PORT=3000
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
NODE_ENV=production
HOST=0.0.0.0
ENDENV

echo "✅ Archivo .env creado"
ENDSSH

echo "✅ Configuración completada"
echo ""

# 3. Instalar dependencias
echo "📦 3/5: Instalando dependencias..."
ssh $VPS_USER@$VPS_IP << ENDSSH
cd $VPS_PATH

# Instalar Bun si no está instalado
if ! command -v bun &> /dev/null; then
    echo "📥 Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
    echo "✅ Bun instalado"
else
    echo "✅ Bun ya está instalado"
fi

echo "📥 Instalando dependencias del proyecto..."
bun install
echo "✅ Dependencias instaladas"
ENDSSH

echo "✅ Dependencias instaladas"
echo ""

# 4. Ejecutar migraciones
echo "🗄️ 4/5: Ejecutando migraciones..."
ssh $VPS_USER@$VPS_IP << ENDSSH
cd $VPS_PATH

echo "📋 Creando tablas..."
bun backend/db/migrations-postgres.ts

echo "🌱 Insertando datos iniciales..."
bun backend/db/seed-postgres.ts

echo "✅ Migraciones completadas"
ENDSSH

echo "✅ Base de datos lista"
echo ""

# 5. Configurar y arrancar servidor
echo "🚀 5/5: Iniciando servidor..."
ssh $VPS_USER@$VPS_IP << ENDSSH
cd $VPS_PATH

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📥 Instalando PM2..."
    npm install -g pm2
    echo "✅ PM2 instalado"
fi

# Crear configuración de PM2
cat > ecosystem.config.cjs << 'ENDPM2'
module.exports = {
  apps: [{
    name: 'reservamesa',
    script: 'backend/server.ts',
    interpreter: '/root/.bun/bin/bun',
    cwd: '$VPS_PATH',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
ENDPM2

# Detener proceso anterior si existe
pm2 delete reservamesa 2>/dev/null || true

# Iniciar aplicación
pm2 start ecosystem.config.cjs

# Guardar configuración
pm2 save
pm2 startup | grep -v "PM2" | bash || true

echo "✅ Servidor iniciado"
ENDSSH

echo ""
echo "✅ ¡Despliegue completado con éxito!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 TU APLICACIÓN ESTÁ LISTA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL de la aplicación:"
echo "   http://$VPS_IP"
echo ""
echo "🔑 Panel de administración:"
echo "   http://$VPS_IP/admin"
echo ""
echo "👤 Credenciales de admin:"
echo "   Usuario: tono"
echo "   Contraseña: 1234"
echo "   Email: info@olardepereiras.com"
echo ""
echo "📊 Ver logs del servidor:"
echo "   ssh $VPS_USER@$VPS_IP 'pm2 logs reservamesa'"
echo ""
echo "🔄 Reiniciar servidor:"
echo "   ssh $VPS_USER@$VPS_IP 'pm2 restart reservamesa'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
