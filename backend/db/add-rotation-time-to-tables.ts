import { Pool } from 'pg';

console.log('🔄 Añadiendo columna rotation_time_minutes a la tabla tables...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addRotationTimeToTables() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 Añadiendo columna rotation_time_minutes a tabla tables...');
    await client.query(`
      ALTER TABLE tables 
      ADD COLUMN IF NOT EXISTS rotation_time_minutes INTEGER DEFAULT 120
    `);

    console.log('✅ Columna rotation_time_minutes añadida exitosamente a tabla tables');
    
    console.log('📋 Actualizando mesas existentes con valor por defecto...');
    await client.query(`
      UPDATE tables 
      SET rotation_time_minutes = 120 
      WHERE rotation_time_minutes IS NULL
    `);
    
    console.log('✅ Mesas actualizadas');
    console.log('🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addRotationTimeToTables();
