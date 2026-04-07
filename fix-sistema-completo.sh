#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ARREGLANDO SISTEMA COMPLETO - QUIEROMESA.COM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Sincronizando contraseña de PostgreSQL..."
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

echo ""
echo "📋 Paso 2: Actualizando archivo env..."
sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db|g' /var/www/reservamesa/env

echo ""
echo "📋 Paso 3: Verificando conexión a PostgreSQL..."
export PGPASSWORD='MiContrasenaSegura666'
psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexión a PostgreSQL exitosa"
else
    echo "❌ Error de conexión a PostgreSQL"
    exit 1
fi

echo ""
echo "📋 Paso 4: Deteniendo servidor backend..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 5: Ejecutando arreglos de base de datos..."
echo ""
bun run backend/db/fix-all-critical-sistema.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "📋 Paso 6: Reiniciando servidor backend..."
    nohup bun run backend/server.ts > backend.log 2>&1 &
    SERVER_PID=$!
    echo "✅ Servidor iniciado con PID: $SERVER_PID"
    
    echo ""
    echo "📋 Paso 7: Esperando que el servidor inicie (3 segundos)..."
    sleep 3
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ SISTEMA COMPLETAMENTE OPERATIVO"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 URLS DE ACCESO:"
    echo "   📱 Cliente: https://quieromesa.com"
    echo "   🍽️  Restaurante: https://quieromesa.com/restaurant"
    echo "   🔐 Admin: https://quieromesa.com/admin/login"
    echo ""
    echo "🔑 CREDENCIALES DE ADMIN:"
    echo "   Usuario: tono77"
    echo "   Contraseña: 1500"
    echo ""
    echo "📋 LOGS DEL SERVIDOR:"
    echo "   tail -f /var/www/reservamesa/backend.log"
    echo ""
else
    echo ""
    echo "❌ Error arreglando la base de datos"
    echo "📋 Revisa los logs arriba para más detalles"
    exit 1
fi
