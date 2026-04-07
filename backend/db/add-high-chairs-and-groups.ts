import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  console.log('   Formato: postgresql://usuario:contraseña@localhost:5432/nombre_bd');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addHighChairsAndGroups() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Añadiendo columnas para tronas en restaurants...');
    
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS available_high_chairs INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS high_chair_rotation_minutes INTEGER DEFAULT 120
    `);
    
    console.log('✅ Columnas de tronas añadidas a restaurants');

    console.log('🔧 Creando tabla table_groups...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_groups (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        location_id TEXT,
        table_ids TEXT[] NOT NULL,
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        priority INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Tabla table_groups creada');

    console.log('🔧 Añadiendo índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_table_groups_restaurant 
      ON table_groups(restaurant_id)
    `);
    
    console.log('✅ Índices creados');

    console.log('🔧 Añadiendo columna high_chair_count a reservations...');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS high_chair_count INTEGER DEFAULT 0
    `);
    
    console.log('✅ Columna high_chair_count añadida a reservations');

    console.log('🔧 Añadiendo columna is_group a reservations...');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS group_id TEXT
    `);
    
    console.log('✅ Columnas de grupos añadidas a reservations');

    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addHighChairsAndGroups().catch(console.error);
