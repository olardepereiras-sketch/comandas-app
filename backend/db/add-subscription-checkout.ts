import { Pool } from 'pg';

export async function addSubscriptionCheckout(pool: Pool) {
  console.log('🔄 [DB MIGRATION] Agregando sistema de checkout de suscripciones...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_orders (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT,
        subscription_plan_id TEXT NOT NULL,
        subscription_duration_id TEXT NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        stripe_session_id TEXT,
        stripe_payment_intent_id TEXT,
        status TEXT DEFAULT 'pending',
        restaurant_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE SET NULL,
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        FOREIGN KEY (subscription_duration_id) REFERENCES subscription_durations(id) ON DELETE RESTRICT
      )
    `);

    console.log('✅ Tabla subscription_orders creada');

    await client.query(`
      ALTER TABLE restaurants
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT
    `);

    console.log('✅ Campo stripe_customer_id agregado a restaurants');

    await client.query('COMMIT');
    console.log('✅ [DB MIGRATION] Sistema de checkout de suscripciones agregado exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DB MIGRATION] Error al agregar sistema de checkout:', error);
    throw error;
  } finally {
    client.release();
  }
}
