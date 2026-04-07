#!/bin/bash

echo "🔐 SINCRONIZANDO CREDENCIALES DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Definir la contraseña final que queremos usar
FINAL_PASSWORD="MiContrasenaSegura666"

echo "📋 Paso 1: Reseteando contraseña de PostgreSQL a: $FINAL_PASSWORD"
sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD '$FINAL_PASSWORD';"

if [ $? -eq 0 ]; then
    echo "✅ Contraseña de PostgreSQL actualizada"
else
    echo "❌ Error actualizando contraseña de PostgreSQL"
    exit 1
fi

echo ""
echo "📋 Paso 2: Actualizando archivo .env"
# Reemplazar la contraseña en DATABASE_URL
sed -i "s|postgresql://reservamesa_user:[^@]*@|postgresql://reservamesa_user:$FINAL_PASSWORD@|g" /var/www/reservamesa/env

# Reemplazar la contraseña en EXPO_PUBLIC_RORK_DB_ENDPOINT
sed -i "s|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:[^@]*@|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:$FINAL_PASSWORD@|g" /var/www/reservamesa/env

echo "✅ Archivo .env actualizado"

echo ""
echo "📋 Paso 3: Probando conexión con la nueva contraseña..."
export DATABASE_URL="postgresql://reservamesa_user:$FINAL_PASSWORD@localhost:5432/reservamesa_db"

PGPASSWORD=$FINAL_PASSWORD psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa con la nueva contraseña"
else
    echo "❌ Error en la conexión"
    exit 1
fi

echo ""
echo "📋 Paso 4: Matando procesos del servidor backend..."
pkill -f "bun.*backend/server.ts" 2>/dev/null
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 5: Reiniciando servidor backend..."
cd /var/www/reservamesa
nohup bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "📋 Paso 6: Esperando que el servidor inicie (5 segundos)..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CREDENCIALES SINCRONIZADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Usuario: reservamesa_user"
echo "Contraseña: $FINAL_PASSWORD"
echo ""
echo "Verificando logs del backend..."
tail -n 20 backend.log
