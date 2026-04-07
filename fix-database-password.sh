#!/bin/bash

echo "🔧 Solucionando contraseña de PostgreSQL..."
echo ""

echo "📋 Paso 1: Obteniendo contraseña actual de PostgreSQL..."
echo ""

# Intentar obtener la contraseña real de PostgreSQL
echo "🔍 Verificando usuario PostgreSQL..."
sudo -u postgres psql -c "\du" 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  INSTRUCCIONES PARA OBTENER/CONFIGURAR LA CONTRASEÑA:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Si el usuario 'reservamesa_user' NO existe, créalo con:"
echo "  sudo -u postgres psql -c \"CREATE USER reservamesa_user WITH PASSWORD 'tu_contraseña_segura';\""
echo ""
echo "Si el usuario YA existe pero no conoces la contraseña, cámbiala con:"
echo "  sudo -u postgres psql -c \"ALTER USER reservamesa_user WITH PASSWORD 'tu_contraseña_segura';\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "¿Has configurado/conoces la contraseña del usuario PostgreSQL? (s/n): " respuesta

if [ "$respuesta" != "s" ]; then
    echo "❌ Por favor, configura primero la contraseña del usuario PostgreSQL"
    exit 1
fi

echo ""
read -sp "Ingresa la contraseña de PostgreSQL para 'reservamesa_user': " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ La contraseña no puede estar vacía"
    exit 1
fi

echo ""
echo "🔧 Actualizando archivo env..."

# Backup del archivo env actual
cp env env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup creado: env.backup.$(date +%Y%m%d_%H%M%S)"

# Actualizar las líneas de DATABASE_URL y EXPO_PUBLIC_RORK_DB_ENDPOINT
sed -i "s|DATABASE_URL=postgresql://reservamesa_user:[^@]*@|DATABASE_URL=postgresql://reservamesa_user:${DB_PASSWORD}@|g" env
sed -i "s|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:[^@]*@|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:${DB_PASSWORD}@|g" env

echo "✅ Archivo env actualizado"
echo ""

echo "🔍 Verificando conexión a la base de datos..."
export $(grep -v '^#' env | grep -v '^$' | xargs)

# Test de conexión
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U reservamesa_user -d reservamesa -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa a PostgreSQL"
else
    echo "❌ Error: No se pudo conectar a PostgreSQL con las credenciales proporcionadas"
    echo "   Verifica que:"
    echo "   1. El usuario 'reservamesa_user' existe"
    echo "   2. La contraseña es correcta"
    echo "   3. La base de datos 'reservamesa' existe"
    echo ""
    echo "Para crear la base de datos si no existe:"
    echo "  sudo -u postgres psql -c \"CREATE DATABASE reservamesa;\""
    echo "  sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE reservamesa TO reservamesa_user;\""
    exit 1
fi

echo ""
echo "🔄 Reiniciando servidor..."
pkill -f "bun.*backend/server.ts"
sleep 2

nohup bun backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado (PID: $!)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONFIGURACIÓN COMPLETADA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Para verificar que todo funciona:"
echo "  tail -f backend.log"
echo ""
echo "Para verificar las notificaciones de WhatsApp:"
echo "  bun backend/db/diagnose-whatsapp-config-complete.ts"
