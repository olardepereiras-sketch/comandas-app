import { Pool } from 'pg';

console.log('🔄 Agregando columna is_unwanted_client a client_ratings...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addUnwantedClientColumn() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando si existe la columna is_unwanted_client...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'client_ratings' 
      AND column_name = 'is_unwanted_client'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Agregando columna is_unwanted_client a client_ratings...');
      await client.query(`
        ALTER TABLE client_ratings 
        ADD COLUMN is_unwanted_client BOOLEAN DEFAULT false
      `);
      console.log('✅ Columna is_unwanted_client agregada');
    } else {
      console.log('✅ La columna is_unwanted_client ya existe');
    }

    console.log('✅ Columna is_unwanted_client configurada correctamente');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addUnwantedClientColumn()
  .then(() => {
    console.log('✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
