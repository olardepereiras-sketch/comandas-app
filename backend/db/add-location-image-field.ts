import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addLocationImageField() {
  const client = await pool.connect();
  
  try {
    console.log('🔵 Añadiendo campo image_url a table_locations...');
    
    await client.query(`
      ALTER TABLE table_locations 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    
    console.log('✅ Campo image_url añadido exitosamente');
    
  } catch (error) {
    console.error('❌ Error añadiendo campo:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addLocationImageField().catch(console.error);
