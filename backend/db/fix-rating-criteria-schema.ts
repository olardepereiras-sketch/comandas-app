import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixRatingCriteriaSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('🔍 Verificando esquema de rating_criteria...');
    
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rating_criteria'
    `);
    
    console.log('📋 Columnas actuales:', tableCheck.rows.map(r => r.column_name).join(', '));
    
    const hasUpdatedAt = tableCheck.rows.some(r => r.column_name === 'updated_at');
    
    if (!hasUpdatedAt) {
      console.log('➕ Añadiendo columna updated_at...');
      await client.query(`
        ALTER TABLE rating_criteria 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      `);
      console.log('✅ Columna updated_at añadida');
    } else {
      console.log('✅ Columna updated_at ya existe');
    }
    
    console.log('🔍 Verificando esquema de day_exceptions...');
    
    const dayExceptionsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
    `);
    
    console.log('📋 Columnas actuales de day_exceptions:', dayExceptionsCheck.rows.map(r => r.column_name).join(', '));
    
    const hasSpecialMessage = dayExceptionsCheck.rows.some(r => r.column_name === 'special_day_message');
    const hasMessageEnabled = dayExceptionsCheck.rows.some(r => r.column_name === 'special_message_enabled');
    
    if (!hasSpecialMessage) {
      console.log('➕ Añadiendo columna special_day_message...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN IF NOT EXISTS special_day_message TEXT
      `);
      console.log('✅ Columna special_day_message añadida');
    } else {
      console.log('✅ Columna special_day_message ya existe');
    }
    
    if (!hasMessageEnabled) {
      console.log('➕ Añadiendo columna special_message_enabled...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN IF NOT EXISTS special_message_enabled BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('✅ Columna special_message_enabled añadida');
    } else {
      console.log('✅ Columna special_message_enabled ya existe');
    }
    
    console.log('✅ Esquema verificado y corregido exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRatingCriteriaSchema().catch(console.error);
