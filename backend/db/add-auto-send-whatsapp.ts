import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addAutoSendWhatsappColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Agregando columna auto_send_whatsapp a restaurants...');
    
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS auto_send_whatsapp BOOLEAN NOT NULL DEFAULT false
    `);
    
    console.log('✅ Columna auto_send_whatsapp agregada correctamente');
    
    console.log('🔍 Verificando la columna...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' AND column_name = 'auto_send_whatsapp'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Columna verificada:', result.rows[0]);
    } else {
      console.log('⚠️ No se pudo verificar la columna');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addAutoSendWhatsappColumn().catch(console.error);
