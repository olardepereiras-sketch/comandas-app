import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 [MIGRATION] Iniciando migración del sistema de reservas pendientes...');
    
    console.log('📋 [MIGRATION] Verificando columna pending_expires_at...');
    const expiresAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      AND column_name = 'pending_expires_at'
    `);
    
    if (expiresAtCheck.rows.length === 0) {
      console.log('➕ [MIGRATION] Añadiendo columna pending_expires_at...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN pending_expires_at TIMESTAMP
      `);
      console.log('✅ [MIGRATION] Columna pending_expires_at añadida');
    } else {
      console.log('✅ [MIGRATION] Columna pending_expires_at ya existe');
    }
    
    console.log('📋 [MIGRATION] Verificando columna is_new_client...');
    const newClientCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      AND column_name = 'is_new_client'
    `);
    
    if (newClientCheck.rows.length === 0) {
      console.log('➕ [MIGRATION] Añadiendo columna is_new_client...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN is_new_client BOOLEAN DEFAULT false
      `);
      console.log('✅ [MIGRATION] Columna is_new_client añadida');
    } else {
      console.log('✅ [MIGRATION] Columna is_new_client ya existe');
    }
    
    console.log('✅ [MIGRATION] Migración completada exitosamente');
    
  } catch (error: any) {
    console.error('❌ [MIGRATION] Error durante la migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
