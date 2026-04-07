import { Pool } from 'pg';

console.log('🔄 Agregando columnas de notificación...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addColumns() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 Agregando columna notification_phones...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS notification_phones TEXT
    `);

    console.log('📋 Agregando columna notification_email...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS notification_email TEXT
    `);

    console.log('✅ Columnas agregadas exitosamente');
    console.log('🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns();
