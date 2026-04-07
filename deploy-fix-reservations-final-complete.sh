#!/bin/bash

echo "🚀 ARREGLANDO TODOS LOS PROBLEMAS DE RESERVAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Paso 1: Sincronizar credenciales de PostgreSQL
echo ""
echo "📋 Paso 1: Sincronizando credenciales de PostgreSQL..."
cat > /tmp/sync-postgres-password.sh << 'EOFPG'
#!/bin/bash
echo "🔐 SINCRONIZANDO CREDENCIALES DE POSTGRESQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Paso 1: Reseteando contraseña de PostgreSQL a: MiContrasenaSegura666"
sudo -u postgres psql -c "ALTER ROLE reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
echo "✅ Contraseña de PostgreSQL actualizada"

echo ""
echo "📋 Paso 2: Actualizando archivo .env"
sudo sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db|g' /var/www/reservamesa/env
echo "✅ Archivo .env actualizado"

echo ""
echo "📋 Paso 3: Probando conexión con la nueva contraseña..."
cd /var/www/reservamesa
PGPASSWORD=MiContrasenaSegura666 psql -h localhost -U reservamesa_user -d reservamesa_db -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa con la nueva contraseña"
else
    echo "❌ Error en la conexión"
    exit 1
fi

echo ""
echo "📋 Paso 4: Matando procesos del servidor backend..."
pkill -f "bun.*backend/server.ts" || true
sleep 2
echo "✅ Procesos eliminados"

echo ""
echo "📋 Paso 5: Reiniciando servidor backend..."
cd /var/www/reservamesa
nohup bun run backend/server.ts > backend.log 2>&1 &
NEW_PID=$!
echo "✅ Servidor iniciado con PID: $NEW_PID"

echo ""
echo "📋 Paso 6: Esperando que el servidor inicie (5 segundos)..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ CREDENCIALES SINCRONIZADAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Usuario: reservamesa_user"
echo "Contraseña: MiContrasenaSegura666"
EOFPG

chmod +x /tmp/sync-postgres-password.sh
bash /tmp/sync-postgres-password.sh

if [ $? -ne 0 ]; then
    echo "❌ Error sincronizando credenciales"
    exit 1
fi

echo ""
echo "📋 Paso 2: Esperando a que el servidor inicie completamente..."
sleep 5

# Paso 2: Ejecutar arreglos del schema
echo ""
echo "📋 Paso 3: Ejecutando arreglos del schema..."
cd /var/www/reservamesa
bun run backend/db/fix-all-critical-complete.ts

if [ $? -ne 0 ]; then
    echo "❌ Error arreglando schema"
    exit 1
fi

echo ""
echo "📋 Paso 4: Reconstruyendo frontend..."
cd /var/www/reservamesa
bun run build

if [ $? -ne 0 ]; then
    echo "❌ Error en build del frontend"
    exit 1
fi

echo ""
echo "📋 Paso 5: Reiniciando servidor para aplicar cambios..."
pkill -f "bun.*backend/server.ts"
sleep 2
nohup bun run backend/server.ts > backend.log 2>&1 &
echo "✅ Servidor reiniciado con PID: $!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TODOS LOS ARREGLOS COMPLETADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 1. Credenciales de PostgreSQL sincronizadas"
echo "✅ 2. Schema de base de datos arreglado"
echo "✅ 3. Admin user creado: tono77 / 1500"
echo "✅ 4. Tabla clients arreglada (columna no_show)"
echo "✅ 5. Modificación de reservas arreglada"
echo "✅ 6. Frontend reconstruido con cambios"
echo ""
echo "🔍 Para verificar logs:"
echo "   tail -f /var/www/reservamesa/backend.log"
echo ""
echo "🔍 Para verificar login admin:"
echo "   https://quieromesa.com/admin/login"
echo "   Usuario: tono77"
echo "   Contraseña: 1500"
