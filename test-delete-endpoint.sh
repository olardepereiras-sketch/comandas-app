#!/bin/bash

echo "🧪 Test de Endpoint de Borrado"
echo "════════════════════════════════════════════════════════"

# Cargar .env
export $(cat .env | grep -v '^#' | xargs)

# 1. Verificar servidor
echo ""
echo "📋 1. Verificando que el servidor esté corriendo..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Servidor está corriendo"
else
    echo "❌ Servidor NO está corriendo"
    echo "   Inicia el servidor con: bun backend/server.ts"
    exit 1
fi

# 2. Crear un cliente de prueba
echo ""
echo "📋 2. Creando cliente de prueba..."
TEST_ID="test-delete-$(date +%s)"

bun -e "
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(\`
    INSERT INTO clients (id, name, email, phone, country_code)
    VALUES (\$1, 'Test Delete', 'test@delete.com', '+34999999999', '+34')
    RETURNING *
  \`, ['$TEST_ID']);
  
  console.log('✅ Cliente creado:', result.rows[0].id);
  await pool.end();
} catch (err) {
  console.error('❌ Error:', err.message);
  await pool.end();
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
    echo "❌ No se pudo crear el cliente de prueba"
    exit 1
fi

# 3. Probar endpoint con tRPC
echo ""
echo "📋 3. Probando endpoint de borrado vía tRPC..."
echo "   URL: http://localhost:3000/api/trpc/clients.delete"
echo "   Método: POST"
echo "   Cliente ID: $TEST_ID"
echo ""

# Hacer request POST como lo hace tRPC
RESPONSE=$(curl -s -X POST http://localhost:3000/api/trpc/clients.delete \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$TEST_ID\",\"confirmed\":true}")

echo "Respuesta del servidor:"
echo "$RESPONSE"

# 4. Verificar si el cliente fue eliminado
echo ""
echo "📋 4. Verificando si el cliente fue eliminado..."

bun -e "
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query('SELECT * FROM clients WHERE id = \$1', ['$TEST_ID']);
  
  if (result.rows.length === 0) {
    console.log('✅ Cliente fue eliminado correctamente');
  } else {
    console.log('❌ El cliente todavía existe');
  }
  
  await pool.end();
} catch (err) {
  console.error('❌ Error:', err.message);
  await pool.end();
}
"

# 5. Ver últimos logs
echo ""
echo "📋 5. Últimas líneas del log del servidor:"
echo "────────────────────────────────────────────────────────"
tail -30 backend.log | grep -E "(DELETE|ERROR|❌|✅|🔵)" || echo "No hay logs relevantes"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Test completado"
echo ""
echo "Si ves '🔵 [DELETE CLIENT] INICIO' en los logs, el endpoint funciona"
echo "Si NO ves ese mensaje, el problema está en el frontend o en tRPC"
