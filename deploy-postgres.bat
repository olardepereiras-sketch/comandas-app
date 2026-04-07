@echo off
REM 🚀 Script Automatizado de Despliegue - PostgreSQL (Windows)
REM Este script despliega tu proyecto al VPS con PostgreSQL

echo =====================================================
echo 🚀 DESPLIEGUE AUTOMATIZADO A POSTGRESQL
echo =====================================================
echo.

REM =====================================================
REM CONFIGURACIÓN - EDITA ESTOS VALORES
REM =====================================================

set VPS_IP=200.234.236.133
set VPS_USER=root
set VPS_PATH=/var/www/reservamesa
set DB_USER=reservamesa_user
set DB_NAME=reservamesa_db
set DB_PASSWORD=TuPasswordSegura123!

echo 📍 VPS: %VPS_IP%
echo 📂 Ruta: %VPS_PATH%
echo.

REM Verificar que pscp y plink estén disponibles
where pscp >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: pscp no encontrado. Instala PuTTY desde https://www.putty.org/
    echo    O usa WinSCP o FileZilla para subir los archivos manualmente.
    pause
    exit /b 1
)

REM 1. Subir archivos
echo 📤 1/5: Subiendo archivos al VPS...
echo    Esto puede tardar varios minutos...
echo.

pscp -r -batch ^
  -P 22 ^
  * %VPS_USER%@%VPS_IP%:%VPS_PATH%/

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error subiendo archivos
    pause
    exit /b 1
)

echo ✅ Archivos subidos
echo.

REM 2-5. Ejecutar comandos en el VPS
echo 🔧 2/5: Configurando PostgreSQL...
echo.

plink -batch %VPS_USER%@%VPS_IP% "cd %VPS_PATH% && bash -s" << 'ENDSCRIPT'

set -e

# Instalar PostgreSQL si no está
if ! command -v psql &> /dev/null; then
    echo "📦 Instalando PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL instalado"
else
    echo "✅ PostgreSQL ya está instalado"
fi

# Configurar base de datos
echo "🗄️ Configurando base de datos..."
sudo -u postgres psql << EOPSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '%DB_USER%') THEN
    CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE %DB_NAME% OWNER %DB_USER%'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '%DB_NAME%')\gexec

GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;
EOPSQL

echo "✅ Base de datos configurada"

# Crear .env
echo "📝 Creando .env..."
cat > .env << ENDENV
EXPO_PUBLIC_RORK_API_BASE_URL=http://%VPS_IP%
EXPO_PUBLIC_API_URL=http://%VPS_IP%
PORT=3000
DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@localhost:5432/%DB_NAME%
NODE_ENV=production
HOST=0.0.0.0
ENDENV

# Instalar Bun
if ! command -v bun &> /dev/null; then
    echo "📥 Instalando Bun..."
    curl -fsSL https://bun.sh/install | bash
    source /root/.bashrc
fi

# Instalar dependencias
echo "📦 3/5: Instalando dependencias..."
bun install

# Migraciones
echo "🗄️ 4/5: Ejecutando migraciones..."
bun backend/db/migrations-postgres.ts
bun backend/db/seed-postgres.ts

# PM2
echo "🚀 5/5: Iniciando servidor..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

cat > ecosystem.config.cjs << 'ENDPM2'
module.exports = {
  apps: [{
    name: 'reservamesa',
    script: 'backend/server.ts',
    interpreter: '/root/.bun/bin/bun',
    cwd: '%VPS_PATH%',
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

pm2 delete reservamesa 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | grep -v "PM2" | bash || true

echo "✅ Servidor iniciado"
ENDSCRIPT

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Error durante la configuración
    pause
    exit /b 1
)

echo.
echo =====================================================
echo ✅ ¡DESPLIEGUE COMPLETADO CON ÉXITO!
echo =====================================================
echo.
echo 🌐 URL de la aplicación:
echo    http://%VPS_IP%
echo.
echo 🔑 Panel de administración:
echo    http://%VPS_IP%/admin
echo.
echo 👤 Credenciales de admin:
echo    Usuario: tono
echo    Contraseña: 1234
echo    Email: info@olardepereiras.com
echo.
echo 📊 Ver logs del servidor:
echo    plink %VPS_USER%@%VPS_IP% "pm2 logs reservamesa"
echo.
echo 🔄 Reiniciar servidor:
echo    plink %VPS_USER%@%VPS_IP% "pm2 restart reservamesa"
echo.
echo =====================================================
echo.
pause
