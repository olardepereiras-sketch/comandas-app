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

async function addMinBookingAdvanceColumn() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida');
    
    console.log('📋 Agregando columna min_booking_advance_minutes...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS min_booking_advance_minutes INTEGER DEFAULT 0
    `);
    
    console.log('✅ Columna min_booking_advance_minutes agregada');
    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMinBookingAdvanceColumn().catch(console.error);
