#!/bin/bash

echo "🧪 Test de Borrado - Directamente desde el servidor"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Este script probará si el endpoint de borrado funciona correctamente"
echo "haciendo una petición directa al servidor."
echo ""

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Obtener un cliente de prueba
echo "📋 1. Obteniendo lista de clientes..."
CLIENTS=$(bun -e "
import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
const result = await pool.query('SELECT id, name, phone FROM clients LIMIT 5');
console.log(JSON.stringify(result.rows, null, 2));
await pool.end();
")

echo "$CLIENTS"
echo ""
echo "📋 2. Selecciona un ID de cliente de la lista anterior"
echo "    O presiona Enter para crear un cliente de prueba"
read -p "ID del cliente: " CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
  echo ""
  echo "📋 Creando cliente de prueba..."
  CLIENT_ID=$(bun -e "
  import { Pool } from 'pg';
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const id = 'test-delete-' + Date.now();
  await pool.query(
    'INSERT INTO clients (id, name, phone, rating, total_ratings, country_code) VALUES (\$1, \$2, \$3, \$4, \$5, \$6)',
    [id, 'Test Delete', '+34999888777', 5.0, 0, '+34']
  );
  console.log(id);
  await pool.end();
  ")
  echo "✅ Cliente de prueba creado: $CLIENT_ID"
fi

echo ""
echo "📋 3. Probando endpoint de borrado con curl..."
echo "------------------------------------------------------------"
echo "URL: http://localhost:3000/trpc/clients.delete"
echo "Método: POST"
echo "Cliente ID: $CLIENT_ID"
echo ""

# Hacer petición directa al endpoint
RESPONSE=$(curl -s -X POST http://localhost:3000/trpc/clients.delete \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$CLIENT_ID\"}")

echo "Respuesta del servidor:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar si el cliente fue eliminado
echo "📋 4. Verificando si el cliente fue eliminado..."
EXISTS=$(bun -e "
import { Pool } from 'pg';
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
const result = await pool.query('SELECT COUNT(*) FROM clients WHERE id = \$1', ['$CLIENT_ID']);
console.log(result.rows[0].count);
await pool.end();
")

if [ "$EXISTS" = "0" ]; then
  echo "✅ Cliente eliminado correctamente"
else
  echo "❌ El cliente todavía existe en la base de datos"
fi

echo ""
echo "📋 5. Revisando últimas líneas del log del servidor..."
echo "------------------------------------------------------------"
tail -30 backend.log | grep -E '(DELETE|delete|Client)' --color=always

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Test completado"
