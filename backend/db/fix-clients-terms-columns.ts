import pg from 'pg';
const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function fixClientsTermsColumns() {
  console.log('🔄 Añadiendo columnas de términos a tabla clients...');

  try {
    console.log('✅ Conectando a PostgreSQL...');

    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS whatsapp_notifications_accepted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS data_storage_accepted BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS rating_accepted BOOLEAN DEFAULT false
    `);

    console.log('✅ Columnas de términos añadidas exitosamente');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('terms_accepted_at', 'whatsapp_notifications_accepted', 'data_storage_accepted', 'rating_accepted')
      ORDER BY column_name
    `);

    console.log('\n📋 Columnas de términos en clients:');
    result.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})${row.column_default ? ` DEFAULT ${row.column_default}` : ''}`);
    });

    console.log('\n🔄 Actualizando clientes existentes sin términos aceptados...');
    const updateResult = await pool.query(`
      UPDATE clients 
      SET 
        terms_accepted_at = created_at,
        whatsapp_notifications_accepted = true,
        data_storage_accepted = true,
        rating_accepted = true
      WHERE terms_accepted_at IS NULL
    `);

    console.log(`✅ ${updateResult.rowCount} clientes actualizados`);

    console.log('\n🎉 Proceso completado exitosamente');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixClientsTermsColumns();
