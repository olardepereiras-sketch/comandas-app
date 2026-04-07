import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function addTermsAcceptanceFields() {
  console.log('🔄 Añadiendo campos de aceptación de términos a la tabla clients...');

  try {
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS whatsapp_notifications_accepted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS data_storage_accepted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS rating_accepted BOOLEAN DEFAULT false
    `);

    console.log('✅ Campos de términos añadidos exitosamente');

    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('terms_accepted_at', 'whatsapp_notifications_accepted', 'data_storage_accepted', 'rating_accepted')
      ORDER BY column_name
    `);

    console.log('📋 Campos de términos en clients:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error añadiendo campos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTermsAcceptanceFields();
