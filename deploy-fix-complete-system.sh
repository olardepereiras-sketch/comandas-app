#!/bin/bash

echo "🚀 ARREGLANDO SISTEMA COMPLETO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Sincronizando credenciales de PostgreSQL..."

# Resetear contraseña de PostgreSQL
sudo -u postgres psql <<EOF
ALTER USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';
\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ Contraseña de PostgreSQL actualizada"
else
    echo "❌ Error actualizando contraseña de PostgreSQL"
    exit 1
fi

# Actualizar .env
sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db|g' /var/www/reservamesa/env

# Probar conexión
PGPASSWORD='MiContrasenaSegura666' psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Conexión a PostgreSQL exitosa"
else
    echo "❌ Error de conexión a PostgreSQL"
    exit 1
fi

echo ""
echo "📋 Paso 2: Matando procesos del servidor backend..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 3: Reiniciando servidor backend..."
nohup bun run backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!
echo "✅ Servidor iniciado con PID: $SERVER_PID"

echo ""
echo "📋 Paso 4: Esperando que el servidor inicie (5 segundos)..."
sleep 5

echo ""
echo "📋 Paso 5: Ejecutando arreglos del schema..."
bun run backend/db/fix-complete-system.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SISTEMA COMPLETAMENTE ARREGLADO"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔐 Credenciales de admin:"
    echo "   Usuario: tono77"
    echo "   Contraseña: 1500"
    echo "   URL: https://quieromesa.com/admin/login"
    echo ""
    echo "✅ Problemas resueltos:"
    echo "   ✅ Modificación de reservas por token"
    echo "   ✅ Sistema de day-exceptions para calendario"
    echo "   ✅ Login de admin"
    echo "   ✅ Tabla clients con columna no_show"
    echo "   ✅ Tabla whatsapp_notifications arreglada"
    echo ""
    echo "📋 El servidor está ejecutándose en segundo plano"
    echo "   Para ver logs: tail -f backend.log"
    echo ""
else
    echo "❌ Error arreglando schema"
    exit 1
fi
