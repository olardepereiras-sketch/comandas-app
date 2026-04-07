import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');
console.log('📋 DATABASE_URL:', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    
    const result = await client.query('SELECT * FROM provinces ORDER BY name');
    console.log(`📦 Provincias encontradas: ${result.rows.length}`);
    console.log('📋 Datos:', result.rows);
    
    const cities = await client.query('SELECT * FROM cities ORDER BY name');
    console.log(`📦 Ciudades encontradas: ${cities.rows.length}`);
    console.log('📋 Datos:', cities.rows);
    
    client.release();
    await pool.end();
    
    console.log('✅ Test completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();
