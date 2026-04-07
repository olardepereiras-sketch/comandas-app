import { Pool } from 'pg';

console.log('🔄 Agregando columnas faltantes para sistema de reservas pendientes...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addPendingReservationColumns() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Agregando columnas faltantes a reservations...');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_phone TEXT,
      ADD COLUMN IF NOT EXISTS client_name TEXT,
      ADD COLUMN IF NOT EXISTS client_email TEXT,
      ADD COLUMN IF NOT EXISTS location_name TEXT,
      ADD COLUMN IF NOT EXISTS client_notes TEXT,
      ADD COLUMN IF NOT EXISTS confirmation_token2 TEXT,
      ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT false
    `);
    
    console.log('✅ Columnas agregadas exitosamente');

    console.log('📋 Creando índices para optimización...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_pending_expires 
      ON reservations(pending_expires_at) 
      WHERE status = 'pending'
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token2 
      ON reservations(confirmation_token2)
    `);
    
    console.log('✅ Índices creados exitosamente');

    console.log('✅ Actualización completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPendingReservationColumns()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
