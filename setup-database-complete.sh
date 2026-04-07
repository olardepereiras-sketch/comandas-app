#!/bin/bash

echo "🚀 CONFIGURANDO BASE DE DATOS COMPLETA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Variables correctas del proyecto (MEMORIZAR)
DB_USER="reservamesa_user"
DB_PASSWORD="MiContrasenaSegura666"
DB_NAME="reservamesa_db"

echo "📋 Paso 1: Asegurando que el usuario PostgreSQL existe..."
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || \
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
echo "✅ Usuario configurado"

echo ""
echo "📋 Paso 2: Ejecutando script de configuración..."
cd /var/www/reservamesa
bun backend/db/setup-database-and-fix-schema.ts

if [ $? -eq 0 ]; then
  echo ""
  echo "📋 Paso 3: Matando procesos del servidor..."
  pkill -f "bun.*backend/server.ts" 2>/dev/null || true
  sleep 2
  echo "✅ Procesos eliminados"
  
  echo ""
  echo "📋 Paso 4: Iniciando servidor..."
  nohup bun backend/server.ts > backend.log 2>&1 &
  NEW_PID=$!
  echo "✅ Servidor iniciado con PID: $NEW_PID"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ CONFIGURACIÓN COMPLETADA"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Base de datos: $DB_NAME"
  echo "👤 Usuario: $DB_USER"
  echo "🔒 Contraseña: $DB_PASSWORD"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "❌ Error en la configuración"
  exit 1
fi
