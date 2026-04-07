import { Pool } from 'pg';

export async function addDepositsSystem(pool: Pool) {
  console.log('🔄 [DB MIGRATION] Agregando sistema de fianzas...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS deposits_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deposits_apply_to_all_days BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS deposits_default_amount DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS deposits_stripe_account_id TEXT,
      ADD COLUMN IF NOT EXISTS deposits_stripe_secret_key TEXT,
      ADD COLUMN IF NOT EXISTS deposits_stripe_publishable_key TEXT,
      ADD COLUMN IF NOT EXISTS deposits_custom_message TEXT,
      ADD COLUMN IF NOT EXISTS deposits_specific_days JSONB DEFAULT '[]'::jsonb
    `);

    console.log('✅ Columnas de fianzas agregadas a restaurants');

    await client.query('COMMIT');
    console.log('✅ [DB MIGRATION] Sistema de fianzas agregado exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DB MIGRATION] Error al agregar sistema de fianzas:', error);
    throw error;
  } finally {
    client.release();
  }
}
