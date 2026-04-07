#!/bin/bash

echo "🚀 ARREGLANDO TODOS LOS PROBLEMAS CRÍTICOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📋 Paso 1: Sincronizando credenciales de PostgreSQL..."

# Sincronizar contraseña de PostgreSQL
sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';" 2>&1 | grep -v "could not change directory"

# Actualizar .env con la contraseña correcta
sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db|g' /var/www/reservamesa/env

# Probar conexión
PGPASSWORD='MiContrasenaSegura666' psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Conexión a PostgreSQL exitosa"
else
    echo "❌ Error de conexión a PostgreSQL"
    exit 1
fi

# Reiniciar servidor backend
echo ""
echo "📋 Paso 2: Reiniciando servidor backend..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
cd /var/www/reservamesa
nohup bun run backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado"

# Esperar a que el servidor inicie
echo ""
echo "📋 Paso 3: Esperando a que el servidor inicie completamente..."
sleep 5

echo ""
echo "📋 Paso 4: Ejecutando arreglos del schema..."
cd /var/www/reservamesa
bun run backend/db/fix-all-critical-complete.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ TODOS LOS ARREGLOS COMPLETADOS EXITOSAMENTE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔐 Credenciales de admin actualizadas:"
    echo "  Usuario: tono77"
    echo "  Contraseña: 1500"
    echo ""
    echo "🧪 Para probar login admin:"
    echo "  https://quieromesa.com/admin/login"
    echo ""
    echo "✅ Modificación de reservas por token: ARREGLADO"
    echo "✅ Calendario en reservations-pro: MEJORADO"
    echo "✅ Tabla whatsapp_notifications: ARREGLADA"
    echo "✅ Login de admin: CONFIGURADO"
else
    echo "❌ Error ejecutando arreglos"
    exit 1
fi
