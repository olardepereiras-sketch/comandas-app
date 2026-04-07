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

async function addConfigProColumns() {
  console.log('🔧 Agregando columnas faltantes a la tabla restaurants...');

  try {
    await pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS min_modify_cancel_minutes INTEGER DEFAULT 180,
      ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24,
      ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60;
    `);

    console.log('✅ Columnas agregadas exitosamente');

    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN (
        'enable_email_notifications',
        'min_modify_cancel_minutes',
        'reminder1_enabled',
        'reminder1_hours',
        'reminder2_enabled',
        'reminder2_minutes'
      )
      ORDER BY column_name;
    `);

    console.log('✅ Columnas verificadas:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addConfigProColumns();
