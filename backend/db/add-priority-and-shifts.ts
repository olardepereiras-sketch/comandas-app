import { Pool } from 'pg';

console.log('🔄 Añadiendo campo priority a tables y creando tablas shift_templates y day_exceptions...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Añadiendo columna priority a tables...');
    await client.query(`
      ALTER TABLE tables 
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 9)
    `);

    console.log('📋 Creando tabla shift_templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_templates (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        time_slots TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla day_exceptions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS day_exceptions (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        date DATE NOT NULL,
        is_open BOOLEAN NOT NULL DEFAULT false,
        enabled_shift_ids TEXT,
        max_guests_per_shift TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, date)
      )
    `);

    console.log('✅ Migraciones completadas exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error ejecutando migraciones:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
