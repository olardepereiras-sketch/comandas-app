import { Pool } from 'pg';

console.log('🔄 Corrigiendo tabla restaurants y day_exceptions...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixTables() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 Añadiendo columna table_rotation_time a restaurants...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS table_rotation_time INTEGER DEFAULT 100
    `);
    console.log('✅ Columna table_rotation_time añadida');

    console.log('📋 Verificando tabla day_exceptions...');
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'day_exceptions'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Tabla day_exceptions existe');
    } else {
      console.log('📋 Creando tabla day_exceptions...');
      await client.query(`
        CREATE TABLE day_exceptions (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          date TEXT NOT NULL,
          is_open BOOLEAN NOT NULL,
          template_ids TEXT,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          UNIQUE(restaurant_id, date)
        )
      `);
      console.log('✅ Tabla day_exceptions creada');
    }

    console.log('🎉 Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixTables();
