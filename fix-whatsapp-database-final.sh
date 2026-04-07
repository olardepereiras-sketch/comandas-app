#!/bin/bash

echo "🔧 Solución definitiva: Base de datos y WhatsApp"
echo ""

# Paso 1: Configurar contraseña de PostgreSQL
echo "📋 Paso 1: Configurando usuario PostgreSQL..."
sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"

# Paso 2: Verificar que la base de datos existe
echo ""
echo "📋 Paso 2: Verificando base de datos..."
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='reservamesa_db'")

if [ "$DB_EXISTS" != "1" ]; then
  echo "⚠️ Base de datos no existe, creándola..."
  sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
fi

# Paso 3: Otorgar permisos
echo ""
echo "📋 Paso 3: Otorgando permisos..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL ON SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO reservamesa_user;"

# Paso 4: Eliminar .env duplicado
echo ""
echo "📋 Paso 4: Limpiando archivos de configuración..."
if [ -f ".env" ]; then
  rm -f .env
  echo "✅ Archivo .env duplicado eliminado"
fi

# Paso 5: Verificar conexión
echo ""
echo "📋 Paso 5: Verificando conexión..."
export DATABASE_URL="postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db"
if PGPASSWORD=MiContrasenaSegura666 psql -U reservamesa_user -d reservamesa_db -h localhost -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Conexión exitosa"
else
  echo "❌ Error de conexión. Verificando pg_hba.conf..."
  sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -E "^(local|host)"
  exit 1
fi

# Paso 6: Matar todos los procesos del servidor
echo ""
echo "📋 Paso 6: Deteniendo servidor completamente..."
pkill -9 -f "bun.*backend/server.ts"
pkill -9 -f "node.*backend/server.ts"
sleep 2

# Paso 7: Limpiar caché de Bun
echo ""
echo "📋 Paso 7: Limpiando caché..."
rm -rf node_modules/.cache
rm -rf /tmp/bun-*

# Paso 8: Rebuild frontend
echo ""
echo "📋 Paso 8: Reconstruyendo frontend..."
cd /var/www/reservamesa
rm -rf dist .expo
bunx expo export -p web

# Paso 9: Iniciar servidor con variables de entorno correctas
echo ""
echo "📋 Paso 9: Iniciando servidor..."
cd /var/www/reservamesa

# Cargar variables de entorno correctamente
export $(grep -v '^#' env | grep -v '^$' | xargs)

# Iniciar servidor en background
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!

echo "✅ Servidor iniciado (PID: $SERVER_PID)"

# Paso 10: Esperar y verificar logs
echo ""
echo "📋 Paso 10: Verificando inicio del servidor..."
sleep 5

if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Servidor corriendo correctamente"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ SOLUCIÓN COMPLETA APLICADA"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "🔍 Verificar logs:"
  echo "   tail -f /var/www/reservamesa/backend.log"
  echo ""
  echo "🔄 Si necesitas reiniciar:"
  echo "   pkill -f 'bun.*backend/server.ts' && bun backend/server.ts > backend.log 2>&1 &"
else
  echo "❌ Error al iniciar servidor. Ver logs:"
  tail -50 backend.log
  exit 1
fi
