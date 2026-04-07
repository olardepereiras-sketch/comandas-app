import { Pool } from 'pg';

async function addWhatsAppWebField() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Agregando campo use_whatsapp_web a la tabla restaurants...');

    await pool.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS use_whatsapp_web BOOLEAN DEFAULT false
    `);

    console.log('✅ Campo use_whatsapp_web agregado correctamente');

  } catch (error) {
    console.error('❌ Error agregando campo:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addWhatsAppWebField();
