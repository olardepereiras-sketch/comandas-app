#!/bin/bash

echo "🔧 Script de Diagnóstico y Corrección Definitivo"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📋 PASO 1: Verificando archivo .env"
echo "────────────────────────────────────────────────────────────────"

if [ -f .env ]; then
    echo -e "${GREEN}✅${NC} Archivo .env encontrado"
    
    # Verificar si tiene contraseña placeholder
    if grep -q "tu_password_seguro" .env; then
        echo -e "${RED}❌ ERROR CRÍTICO: .env tiene contraseña placeholder 'tu_password_seguro'${NC}"
        echo ""
        echo "🔍 Intentando encontrar la contraseña real de PostgreSQL..."
        echo ""
        
        # Intentar obtener la contraseña del sistema
        if sudo -u postgres psql -d reservamesa_db -c "SELECT 1;" 2>/dev/null | grep -q "1 row"; then
            echo -e "${YELLOW}⚠️  PostgreSQL está usando autenticación peer/trust${NC}"
            echo ""
            echo "Opciones:"
            echo "1. Obtener la contraseña actual ejecutando:"
            echo "   ${BLUE}sudo -u postgres psql${NC}"
            echo "   ${BLUE}\\password reservamesa_user${NC}"
            echo ""
            echo "2. O crear una nueva contraseña:"
            read -p "¿Quieres crear una nueva contraseña ahora? (s/n): " create_password
            
            if [ "$create_password" = "s" ] || [ "$create_password" = "S" ]; then
                read -sp "Ingresa la nueva contraseña para reservamesa_user: " new_password
                echo ""
                read -sp "Confirma la contraseña: " confirm_password
                echo ""
                
                if [ "$new_password" = "$confirm_password" ]; then
                    sudo -u postgres psql -c "ALTER USER reservamesa_user WITH PASSWORD '$new_password';"
                    
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}✅ Contraseña actualizada${NC}"
                        
                        # Actualizar .env
                        sed -i "s|DATABASE_URL=postgresql://reservamesa_user:tu_password_seguro@localhost:5432/reservamesa|DATABASE_URL=postgresql://reservamesa_user:$new_password@localhost:5432/reservamesa_db|g" .env
                        sed -i "s|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:tu_password_seguro@localhost:5432/reservamesa|EXPO_PUBLIC_RORK_DB_ENDPOINT=postgresql://reservamesa_user:$new_password@localhost:5432/reservamesa_db|g" .env
                        
                        echo -e "${GREEN}✅ Archivo .env actualizado${NC}"
                    else
                        echo -e "${RED}❌ Error actualizando la contraseña${NC}"
                        exit 1
                    fi
                else
                    echo -e "${RED}❌ Las contraseñas no coinciden${NC}"
                    exit 1
                fi
            else
                echo ""
                echo "Por favor, actualiza manualmente el archivo .env con la contraseña correcta"
                echo "Edita: ${BLUE}nano .env${NC}"
                echo "Busca: DATABASE_URL y EXPO_PUBLIC_RORK_DB_ENDPOINT"
                echo "Reemplaza: tu_password_seguro con la contraseña real"
                exit 1
            fi
        fi
    else
        echo -e "${GREEN}✅${NC} .env tiene configuración válida"
    fi
else
    echo -e "${RED}❌ Archivo .env NO encontrado${NC}"
    exit 1
fi

echo ""
echo "📋 PASO 2: Probando conexión a PostgreSQL"
echo "────────────────────────────────────────────────────────────────"

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Crear script de prueba
cat > test-db-connection.ts << 'EOF'
import pg from 'pg';

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
  
  console.log('🔍 Probando conexión con:', databaseUrl?.replace(/:[^:]*@/, ':****@'));
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }
  
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: false,
  });
  
  try {
    const result = await pool.query('SELECT NOW(), current_database(), current_user');
    console.log('✅ Conexión exitosa');
    console.log('   Hora del servidor:', result.rows[0].now);
    console.log('   Base de datos:', result.rows[0].current_database);
    console.log('   Usuario:', result.rows[0].current_user);
    
    // Probar consulta a clients
    const clients = await pool.query('SELECT COUNT(*) as count FROM clients');
    console.log('✅ Tabla clients accesible:', clients.rows[0].count, 'clientes');
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error de conexión:', error.message);
    console.error('   Código:', error.code);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
EOF

bun test-db-connection.ts

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ La conexión a PostgreSQL falló${NC}"
    echo ""
    echo "Posibles problemas:"
    echo "1. La contraseña en .env es incorrecta"
    echo "2. PostgreSQL no está corriendo: ${BLUE}sudo systemctl status postgresql${NC}"
    echo "3. El usuario reservamesa_user no existe"
    echo ""
    exit 1
fi

rm test-db-connection.ts

echo ""
echo "📋 PASO 3: Agregando logs detallados al backend"
echo "────────────────────────────────────────────────────────────────"

# Backup del archivo actual
cp backend/hono.ts backend/hono.ts.backup

# Agregar logs detallados
cat > backend/hono-with-logs.ts << 'EOF'
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

app.use('/*', cors());

// Logger middleware detallado
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  console.log('════════════════════════════════════════════════════════');
  console.log(`📨 [${method}] ${path}`);
  console.log('Timestamp:', new Date().toISOString());
  
  if (method === 'POST') {
    try {
      const body = await c.req.text();
      c.req.bodyCache = body;
      console.log('Body:', body.substring(0, 200));
    } catch (e) {
      console.log('Body: (no legible)');
    }
  }
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  console.log(`✅ Response: ${status} (${duration}ms)`);
  console.log('════════════════════════════════════════════════════════');
});

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get('/', (c) => c.json({ message: 'Reservamesa API' }));

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
EOF

# Actualizar el archivo
mv backend/hono-with-logs.ts backend/hono.ts

echo -e "${GREEN}✅${NC} Logs detallados agregados"

echo ""
echo "📋 PASO 4: Reiniciando servidor"
echo "────────────────────────────────────────────────────────────────"

# Matar procesos anteriores
pkill -f "bun.*backend/server.ts"
sleep 2

# Iniciar servidor
bun backend/server.ts > backend.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅${NC} Servidor iniciado (PID: $SERVER_PID)"

sleep 3

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✅${NC} Servidor corriendo correctamente"
else
    echo -e "${RED}❌${NC} Servidor falló al iniciar"
    echo "Últimas líneas del log:"
    tail -20 backend.log
    exit 1
fi

echo ""
echo "📋 PASO 5: Probando endpoint de borrado"
echo "────────────────────────────────────────────────────────────────"

# Crear cliente de prueba
cat > create-test-client.ts << 'EOF'
import pg from 'pg';

async function createTestClient() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
    ssl: false,
  });
  
  try {
    const clientId = `test-client-${Date.now()}`;
    await pool.query(
      'INSERT INTO clients (id, name, email, phone, rating, total_ratings, country_code) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [clientId, 'Test Client', 'test@example.com', '+34999999999', 0, 0, '+34']
    );
    console.log(clientId);
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestClient();
EOF

TEST_CLIENT_ID=$(bun create-test-client.ts)
rm create-test-client.ts

if [ -z "$TEST_CLIENT_ID" ]; then
    echo -e "${RED}❌${NC} No se pudo crear cliente de prueba"
    exit 1
fi

echo "Cliente de prueba creado: $TEST_CLIENT_ID"

# Probar endpoint con curl
sleep 2

echo "Probando DELETE con tRPC..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/trpc/clients.delete \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$TEST_CLIENT_ID\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "Código HTTP: $HTTP_CODE"
echo "Respuesta: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint funciona correctamente${NC}"
else
    echo -e "${RED}❌ Endpoint falló${NC}"
fi

echo ""
echo "📋 PASO 6: Mostrando logs del servidor"
echo "────────────────────────────────────────────────────────────────"
echo "Últimas 30 líneas:"
tail -30 backend.log

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Diagnóstico completado${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "🔍 Para monitorear en tiempo real:"
echo "   ${BLUE}tail -f backend.log${NC}"
echo ""
echo "🧪 AHORA INTENTA:"
echo "   1. Ve a: http://200.234.236.133/admin/users"
echo "   2. Haz clic en un usuario"
echo "   3. Presiona 'Eliminar Usuario'"
echo "   4. El log debería mostrar '[DELETE CLIENT] INICIO'"
echo ""
echo "Si NO aparece en el log, el problema está en el FRONTEND (React Query)"
echo "Si aparece pero falla, el problema está en el BACKEND (PostgreSQL)"
echo ""
