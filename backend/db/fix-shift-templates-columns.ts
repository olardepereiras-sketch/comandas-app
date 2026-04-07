import { Pool } from 'pg';

console.log('🔧 Corrigiendo columnas de shift_templates...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixShiftTemplatesColumns() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('🔄 Eliminando columnas innecesarias de shift_templates...');
    
    await client.query(`
      ALTER TABLE shift_templates 
      DROP COLUMN IF EXISTS max_guests_per_slot,
      DROP COLUMN IF EXISTS min_rating;
    `);

    console.log('✅ Columnas eliminadas exitosamente');
    console.log('🎉 Migración completada');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixShiftTemplatesColumns();
