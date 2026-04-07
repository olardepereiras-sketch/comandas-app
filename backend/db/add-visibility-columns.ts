import { Pool } from 'pg';

console.log('🔄 Añadiendo columnas de visibilidad...');

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
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Añadiendo columna is_visible a subscription_plans...');
    await client.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true
    `);
    
    console.log('📋 Añadiendo columna allowed_duration_ids a subscription_plans...');
    await client.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS allowed_duration_ids TEXT DEFAULT '[]'
    `);

    console.log('📋 Añadiendo columna is_visible a subscription_durations...');
    await client.query(`
      ALTER TABLE subscription_durations 
      ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true
    `);

    console.log('\n✅ Columnas añadidas exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns();
