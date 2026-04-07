import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addLocationImageUrl() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Añadiendo campo image_url a table_locations...');

    await client.query(`
      ALTER TABLE table_locations 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    console.log('✅ Campo image_url añadido correctamente a table_locations');
    
  } catch (error) {
    console.error('❌ Error añadiendo campo image_url:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addLocationImageUrl()
  .then(() => {
    console.log('✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
