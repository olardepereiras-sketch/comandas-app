import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT?.replace('libsql://', 'postgresql://');

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addDetailedRatings() {
  console.log('🔧 [ADD DETAILED RATINGS] Añadiendo campos de valoración detallada...');

  try {
    await pool.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS rating_punctuality DECIMAL(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_behavior DECIMAL(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_kindness DECIMAL(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_education DECIMAL(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_tip DECIMAL(3,1) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_no_shows INTEGER DEFAULT 0
    `);

    console.log('✅ [ADD DETAILED RATINGS] Campos añadidos correctamente');

    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN (
        'rating_punctuality', 
        'rating_behavior', 
        'rating_kindness', 
        'rating_education', 
        'rating_tip', 
        'total_no_shows'
      )
      ORDER BY column_name
    `);

    console.log('📋 [ADD DETAILED RATINGS] Columnas verificadas:');
    result.rows.forEach((row) => {
      console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
    });

    console.log('✅ [ADD DETAILED RATINGS] Migración completada exitosamente');
  } catch (error) {
    console.error('❌ [ADD DETAILED RATINGS] Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addDetailedRatings().catch(console.error);
