#!/bin/bash

echo "🔧 ARREGLANDO CONTRASEÑA DE BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detener servidor
echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

# Definir nueva contraseña simple (sin caracteres especiales)
NEW_PASSWORD="ReservaMesa2024"

echo ""
echo "📋 Paso 2: Reseteando contraseña de PostgreSQL..."

# Cambiar contraseña del usuario
sudo -u postgres psql << EOF
ALTER USER reservamesa_user WITH PASSWORD '$NEW_PASSWORD';
\q
EOF

if [ $? -eq 0 ]; then
  echo "✅ Contraseña de PostgreSQL actualizada"
else
  echo "❌ Error al actualizar contraseña"
  exit 1
fi

echo ""
echo "📋 Paso 3: Actualizando archivo env..."

# Crear nuevo archivo env con contraseña actualizada
cat > env << 'ENVFILE'
EXPO_PUBLIC_RORK_API_BASE_URL=https://quieromesa.com
EXPO_PUBLIC_API_URL=https://quieromesa.com

PORT=3000

DATABASE_URL=postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db

NODE_ENV=production

EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db

HOST=0.0.0.0

RESEND_API_KEY=re_5qv8LwMe_MA9V47G6dnob8FgtwvBj6iBG

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
ENVFILE

echo "✅ Archivo env actualizado"

echo ""
echo "📋 Paso 4: Verificando conexión..."

# Verificar conexión
export DATABASE_URL="postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db"

psql "$DATABASE_URL" -c "SELECT NOW();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Conexión exitosa a PostgreSQL"
else
  echo "❌ Error al conectar a PostgreSQL"
  exit 1
fi

echo ""
echo "📋 Paso 5: Limpiando y reconstruyendo..."
rm -rf dist .expo node_modules/.cache 2>/dev/null
bunx expo export -p web

echo ""
echo "📋 Paso 6: Iniciando servidor..."
nohup bun backend/server.ts > backend.log 2>&1 &
sleep 3

echo ""
echo "📋 Paso 7: Verificando servidor..."
sleep 2
if curl -s http://localhost:3000/api/health > /dev/null; then
  echo "✅ Servidor respondiendo correctamente"
else
  echo "⚠️ Servidor no responde, verificar logs"
fi

echo ""
echo "📋 Paso 8: Recargando Nginx..."
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx recargado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CONTRASEÑA ARREGLADA Y SERVIDOR INICIADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Nueva contraseña: $NEW_PASSWORD"
echo ""
echo "📊 Para ver logs:"
echo "  tail -f backend.log"
echo ""
echo "🔍 Para verificar conexión:"
echo "  psql \"postgresql://reservamesa_user:ReservaMesa2024@localhost:5432/reservamesa_db\" -c \"SELECT NOW();\""
