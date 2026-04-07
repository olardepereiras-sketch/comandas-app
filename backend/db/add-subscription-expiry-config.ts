import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false }
});

async function addSubscriptionExpiryConfig() {
  try {
    console.log('📋 Agregando configuración de alertas de caducidad...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_config (
        id SERIAL PRIMARY KEY,
        expiry_alert_days INTEGER NOT NULL DEFAULT 15,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla subscription_config creada');

    const configResult = await pool.query('SELECT COUNT(*) as count FROM subscription_config');
    if (parseInt(configResult.rows[0].count) === 0) {
      await pool.query(
        'INSERT INTO subscription_config (id, expiry_alert_days) VALUES (1, 15)'
      );
      console.log('✅ Configuración por defecto insertada (15 días)');
    }

    const hasColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name = 'last_expiry_alert_sent'
    `);

    if (hasColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE restaurants 
        ADD COLUMN last_expiry_alert_sent TIMESTAMP
      `);
      console.log('✅ Columna last_expiry_alert_sent agregada a restaurants');
    } else {
      console.log('ℹ️ Columna last_expiry_alert_sent ya existe');
    }

    console.log('✅ Configuración de alertas de caducidad completada');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addSubscriptionExpiryConfig();
