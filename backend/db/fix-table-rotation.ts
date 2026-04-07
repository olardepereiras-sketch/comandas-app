import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fix() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 Verificando columna table_rotation_time...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name = 'table_rotation_time'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('📋 Añadiendo columna table_rotation_time...');
      await client.query(`
        ALTER TABLE restaurants 
        ADD COLUMN table_rotation_time INTEGER NOT NULL DEFAULT 100
      `);
      console.log('✅ Columna table_rotation_time añadida');
    } else {
      console.log('✅ Columna table_rotation_time ya existe');
    }

    console.log('🎉 Corrección completada');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
