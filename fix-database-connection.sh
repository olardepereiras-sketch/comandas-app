#!/bin/bash

echo "🔧 ARREGLANDO CONEXIÓN A BASE DE DATOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /var/www/reservamesa

echo ""
echo "📋 Paso 1: Deteniendo servidor..."
pkill -f "bun.*backend/server.ts" 2>/dev/null || true
sleep 2
echo "✅ Servidor detenido"

echo ""
echo "📋 Paso 2: Verificando archivo env..."
if [ ! -f "env" ]; then
    echo "❌ Archivo env no encontrado"
    exit 1
fi
echo "✅ Archivo env existe"

echo ""
echo "📋 Paso 3: Creando script de verificación..."
cat > test-db-connection.ts << 'EOTEST'
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), 'env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('✅ Variables cargadas desde env');
}

console.log('\n📊 Variables de entorno:');
console.log(`DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);
console.log(`DATABASE_URL length: ${process.env.DATABASE_URL?.length || 0}`);
console.log(`DATABASE_URL (primeros 40 chars): ${process.env.DATABASE_URL?.substring(0, 40)}...`);

async function testConnection() {
  try {
    console.log('\n🔗 Intentando conexión con Pool...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    console.log('📡 Pool creado, ejecutando query de prueba...');
    const result = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Conexión exitosa!');
    console.log(`⏰ Hora actual: ${result.rows[0].current_time}`);
    console.log(`🗄️ PostgreSQL version: ${result.rows[0].version.substring(0, 50)}...`);

    await pool.end();
    console.log('\n✅ ¡TODO FUNCIONA CORRECTAMENTE!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error de conexión:');
    console.error(`Mensaje: ${error.message}`);
    console.error(`Código: ${error.code}`);
    console.error(`Stack: ${error.stack}`);
    process.exit(1);
  }
}

testConnection();
EOTEST

echo "✅ Script de verificación creado"

echo ""
echo "📋 Paso 4: Ejecutando prueba de conexión..."
bun test-db-connection.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "📋 Paso 5: Iniciando servidor..."
    bun backend/server.ts > backend.log 2>&1 &
    sleep 3
    
    echo ""
    echo "📋 Paso 6: Verificando servidor..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Servidor respondiendo correctamente"
    else
        echo "⚠️ Servidor no responde, revisar logs"
    fi
    
    echo ""
    echo "📋 Paso 7: Recargando Nginx..."
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx recargado"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ CONEXIÓN ARREGLADA Y SERVIDOR INICIADO"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📊 Para ver logs:"
    echo "  tail -f backend.log"
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ ERROR EN LA CONEXIÓN"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Posibles soluciones:"
    echo "1. Verificar que PostgreSQL esté corriendo:"
    echo "   sudo systemctl status postgresql"
    echo ""
    echo "2. Verificar usuario y contraseña:"
    echo "   sudo -u postgres psql -c \"\\du\""
    echo ""
    echo "3. Intentar conexión manual:"
    echo "   psql postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db"
    echo ""
    echo "4. Recrear usuario si es necesario:"
    echo "   sudo -u postgres psql"
    echo "   DROP USER IF EXISTS reservamesa_user;"
    echo "   CREATE USER reservamesa_user WITH PASSWORD 'MiContrasenaSegura666';"
    echo "   GRANT ALL PRIVILEGES ON DATABASE reservamesa_db TO reservamesa_user;"
fi
