import pg from 'pg';
const { Pool } = pg;

console.log('🔧 Verificando configuración de base de datos...');
console.log('════════════════════════════════════════════════════════');

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL no está configurado');
  process.exit(1);
}

console.log('✅ DATABASE_URL encontrado');

// Verificar formato
if (dbUrl.startsWith('"') || dbUrl.startsWith("'")) {
  console.error('❌ DATABASE_URL tiene comillas - esto causará errores');
  console.error('   Remueve las comillas del archivo .env');
  process.exit(1);
}

// Test de conexión
console.log('🔍 Probando conexión...');

const pool = new Pool({ connectionString: dbUrl });

try {
  const result = await pool.query('SELECT NOW(), current_database(), current_user');
  console.log('✅ Conexión exitosa');
  console.log('   Hora del servidor:', result.rows[0].now);
  console.log('   Base de datos:', result.rows[0].current_database);
  console.log('   Usuario:', result.rows[0].current_user);
  
  // Verificar tablas
  console.log('');
  console.log('🔍 Verificando tablas...');
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('✅ Tablas encontradas:', tables.rows.map(r => r.table_name).join(', '));
  
  // Verificar clients
  const clients = await pool.query('SELECT COUNT(*) FROM clients');
  console.log('✅ Clientes en base de datos:', clients.rows[0].count);
  
  await pool.end();
  
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('✅ Configuración correcta - el servidor debería funcionar');
  
} catch (error: any) {
  console.error('❌ Error de conexión:', error.message);
  console.error('');
  console.error('Posibles causas:');
  console.error('  1. Contraseña incorrecta en DATABASE_URL');
  console.error('  2. PostgreSQL no está corriendo');
  console.error('  3. Base de datos no existe');
  await pool.end();
  process.exit(1);
}
