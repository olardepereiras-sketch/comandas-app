import { Pool } from 'pg';

console.log('🔄 Agregando sistema de bloqueos por restaurante...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addRestaurantBlocks() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando si existe la columna restaurant_blocks...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name = 'restaurant_blocks'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Agregando columna restaurant_blocks a clients...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN restaurant_blocks JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✅ Columna restaurant_blocks agregada');
    } else {
      console.log('✅ La columna restaurant_blocks ya existe');
    }

    console.log('✅ Sistema de bloqueos por restaurante configurado correctamente');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addRestaurantBlocks()
  .then(() => {
    console.log('✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
