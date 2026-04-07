#!/bin/bash

echo "🔧 Solución Definitiva - Nginx y Borrado de Usuarios"
echo "════════════════════════════════════════════════════════════════"
echo ""

# 1. Verificar configuración de nginx
echo "📋 1. Verificando configuración de nginx..."
echo "────────────────────────────────────────────────────────────────"

# Probar la configuración
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Error en la configuración de nginx"
    echo "   Corrigiendo configuración..."
    
    # Crear configuración básica
    sudo tee /etc/nginx/sites-available/reservamesa > /dev/null <<'EOF'
server {
    listen 80;
    server_name 200.234.236.133;

    # Frontend (React Native Web)
    location / {
        root /var/www/reservamesa/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API (Backend)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

    # Enlazar sitio
    sudo ln -sf /etc/nginx/sites-available/reservamesa /etc/nginx/sites-enabled/reservamesa
    
    # Eliminar default si existe
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Verificar de nuevo
    sudo nginx -t
fi

echo "✅ Configuración de nginx correcta"

# 2. Iniciar nginx
echo ""
echo "📋 2. Iniciando nginx..."
echo "────────────────────────────────────────────────────────────────"

sudo systemctl stop nginx 2>/dev/null
sudo systemctl start nginx

if [ $? -eq 0 ]; then
    echo "✅ Nginx iniciado correctamente"
else
    echo "❌ Error iniciando nginx"
    sudo systemctl status nginx
    exit 1
fi

# 3. Verificar que el backend esté corriendo
echo ""
echo "📋 3. Verificando backend..."
echo "────────────────────────────────────────────────────────────────"

# Matar procesos anteriores
pkill -f "bun.*backend/server.ts" 2>/dev/null

# Cargar variables
cd /var/www/reservamesa
export $(cat .env | grep -v '^#' | xargs)

# Iniciar backend
bun backend/server.ts > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado (PID: $BACKEND_PID)"

# Esperar a que inicie
sleep 3

# Verificar que esté corriendo
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend corriendo"
else
    echo "❌ Backend falló al iniciar"
    tail -20 backend.log
    exit 1
fi

# 4. Test de health check
echo ""
echo "📋 4. Probando health check..."
echo "────────────────────────────────────────────────────────────────"

HEALTH=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Health check OK"
else
    echo "❌ Health check falló"
    echo "$HEALTH"
fi

# 5. Test de endpoint de borrado con datos correctos
echo ""
echo "📋 5. Probando endpoint de borrado..."
echo "────────────────────────────────────────────────────────────────"

# Crear un cliente de prueba primero
TEST_PHONE="+34999$(date +%s)"
TEST_ID="test-delete-$(date +%s)"

echo "Creando cliente de prueba..."
CREATE_RESULT=$(bun -e "
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const client = await pool.connect();
try {
  const result = await client.query(
    'INSERT INTO clients (id, name, phone, email, country_code) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
    ['$TEST_ID', 'Test Delete', '$TEST_PHONE', 'test@delete.com', '+34']
  );
  console.log(result.rows[0].id);
} finally {
  client.release();
  await pool.end();
}
")

if [ -z "$CREATE_RESULT" ]; then
    echo "❌ No se pudo crear cliente de prueba"
    exit 1
fi

echo "✅ Cliente creado: $TEST_ID"

# Probar el borrado con la estructura correcta de tRPC
echo ""
echo "Probando borrado vía API..."
DELETE_RESULT=$(curl -s -X POST \
  http://localhost:3000/api/trpc/clients.delete \
  -H "Content-Type: application/json" \
  -d "{\"clientId\":\"$TEST_ID\"}")

echo "Respuesta del servidor:"
echo "$DELETE_RESULT"

# Verificar si el cliente fue eliminado
echo ""
echo "Verificando si el cliente fue eliminado..."
CHECK_RESULT=$(bun -e "
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const client = await pool.connect();
try {
  const result = await client.query('SELECT id FROM clients WHERE id = \$1', ['$TEST_ID']);
  console.log(result.rowCount);
} finally {
  client.release();
  await pool.end();
}
")

if [ "$CHECK_RESULT" = "0" ]; then
    echo "✅ Cliente eliminado correctamente"
else
    echo "❌ El cliente todavía existe"
    echo "   Esto indica que el endpoint no está funcionando"
fi

# 6. Mostrar últimos logs del backend
echo ""
echo "📋 6. Últimos logs del backend:"
echo "────────────────────────────────────────────────────────────────"
tail -30 backend.log | grep -E "(DELETE|🔵|✅|❌)" || echo "No hay logs de DELETE"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✅ Configuración completada"
echo ""
echo "🌐 URLs disponibles:"
echo "   Frontend: http://200.234.236.133"
echo "   Admin: http://200.234.236.133/admin"
echo "   API: http://200.234.236.133/api"
echo ""
echo "🔍 Monitorear logs:"
echo "   tail -f backend.log | grep -E '(DELETE|🔵|✅|❌)'"
echo ""
echo "🧪 AHORA intenta eliminar un usuario desde:"
echo "   http://200.234.236.133/admin/users"
echo ""
echo "   El log debería mostrar:"
echo "   🔵 [FRONTEND] INICIO - Intentando eliminar cliente"
echo "   🔵 [DELETE CLIENT] INICIO - Eliminando cliente"
echo ""
echo "   Si solo ves el primero, el problema está en la petición HTTP"
echo "   Si no ves ninguno, el problema está en el frontend"
echo ""
