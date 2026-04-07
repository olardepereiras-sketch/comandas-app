import { Pool } from 'pg';

export async function addDepositsIncludeHighChairs(pool: Pool) {
  console.log('🔄 [DB MIGRATION] Agregando columna deposits_include_high_chairs...');

  try {
    await pool.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS deposits_include_high_chairs BOOLEAN DEFAULT TRUE
    `);
    console.log('✅ Columna deposits_include_high_chairs agregada a restaurants');
  } catch (error) {
    console.error('❌ [DB MIGRATION] Error:', error);
    throw error;
  }
}
