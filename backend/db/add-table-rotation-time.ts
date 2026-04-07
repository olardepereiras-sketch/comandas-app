import { Pool } from 'pg';

console.log('🔄 Añadiendo columna table_rotation_time a la tabla restaurants...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addTableRotationTime() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 Añadiendo columna table_rotation_time...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS table_rotation_time INTEGER DEFAULT 100
    `);

    console.log('✅ Columna table_rotation_time añadida exitosamente');
    console.log('🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addTableRotationTime();
