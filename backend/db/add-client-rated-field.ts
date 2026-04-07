import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addClientRatedField() {
  console.log('🔄 Añadiendo campo client_rated a reservations...');

  try {
    await pool.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_rated BOOLEAN DEFAULT false;
    `);

    console.log('✅ Campo client_rated añadido exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addClientRatedField();
