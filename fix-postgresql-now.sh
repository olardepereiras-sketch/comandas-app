#!/bin/bash

echo "🔧 ARREGLANDO POSTGRESQL AHORA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Ver qué está pasando
echo ""
echo "📋 Paso 1: Verificando logs de PostgreSQL..."
sudo tail -30 /var/log/postgresql/postgresql-14-main.log

# Paso 2: Ver el estado del cluster
echo ""
echo "📋 Paso 2: Estado de clusters..."
sudo pg_lsclusters

# Paso 3: Verificar propietario y permisos
echo ""
echo "📋 Paso 3: Verificando permisos..."
sudo ls -la /var/lib/postgresql/14/main/

# Paso 4: Detener todo completamente
echo ""
echo "📋 Paso 4: Deteniendo PostgreSQL completamente..."
sudo systemctl stop postgresql
sudo systemctl stop postgresql@14-main
sudo killall -9 postgres 2>/dev/null || true
sleep 2

# Paso 5: Verificar procesos
echo ""
echo "📋 Paso 5: Verificando que no hay procesos de PostgreSQL..."
ps aux | grep postgres | grep -v grep || echo "✅ No hay procesos de PostgreSQL"

# Paso 6: Verificar puerto
echo ""
echo "📋 Paso 6: Verificando puerto 5432..."
sudo netstat -tlnp | grep 5432 || echo "✅ Puerto 5432 libre"

# Paso 7: Reiniciar el cluster
echo ""
echo "📋 Paso 7: Iniciando cluster de PostgreSQL..."
sudo pg_ctlcluster 14 main start

# Esperar un poco
sleep 3

# Paso 8: Verificar que está corriendo
echo ""
echo "📋 Paso 8: Verificando que PostgreSQL está corriendo..."
sudo pg_lsclusters

# Paso 9: Verificar que podemos conectar
echo ""
echo "📋 Paso 9: Probando conexión como postgres..."
sudo -u postgres psql -c "SELECT version();" || {
  echo "❌ No se puede conectar todavía. Intentando otra vez..."
  sleep 5
  sudo pg_ctlcluster 14 main restart
  sleep 3
  sudo -u postgres psql -c "SELECT version();"
}

# Paso 10: Verificar que la base de datos existe
echo ""
echo "📋 Paso 10: Verificando base de datos reservamesa_db..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw reservamesa_db
if [ $? -eq 0 ]; then
  echo "✅ Base de datos reservamesa_db existe"
else
  echo "⚠️ Base de datos no existe, creándola..."
  sudo -u postgres psql -c "CREATE DATABASE reservamesa_db;"
  sudo -u postgres psql -c "CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
  sudo -u postgres psql -d reservamesa_db -c "GRANT ALL PRIVILEGES ON SCHEMA public TO reservamesa_user;"
  sudo -u postgres psql -d reservamesa_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO reservamesa_user;"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ POSTGRESQL ARREGLADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
