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

async function addTokenColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Agregando columna token a reservations...');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;
    `);
    
    console.log('✅ Columna token agregada');
    
    console.log('🔧 Generando tokens para reservas existentes...');
    
    const { rows } = await client.query(`
      SELECT id FROM reservations WHERE token IS NULL;
    `);
    
    for (const row of rows) {
      const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await client.query(`
        UPDATE reservations 
        SET token = $1 
        WHERE id = $2;
      `, [token, row.id]);
    }
    
    console.log(`✅ ${rows.length} tokens generados`);
    
    console.log('🔧 Haciendo la columna NOT NULL...');
    
    await client.query(`
      ALTER TABLE reservations 
      ALTER COLUMN token SET NOT NULL;
    `);
    
    console.log('✅ Columna token configurada correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTokenColumn();
