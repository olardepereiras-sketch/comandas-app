import { Pool } from 'pg';

console.log('🔄 Corrigiendo estructura completa de shift_templates y day_exceptions...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Eliminando tabla shift_templates antigua...');
    await client.query(`DROP TABLE IF EXISTS shift_templates CASCADE`);

    console.log('📋 Creando tabla shift_templates con estructura correcta...');
    await client.query(`
      CREATE TABLE shift_templates (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        times TEXT NOT NULL,
        max_guests_per_slot INTEGER DEFAULT 999,
        min_rating DECIMAL(3,1) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Verificando tabla day_exceptions...');
    const dayExceptionsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'day_exceptions'
      )
    `);

    if (!dayExceptionsExists.rows[0].exists) {
      console.log('📋 Creando tabla day_exceptions...');
      await client.query(`
        CREATE TABLE day_exceptions (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          date DATE NOT NULL,
          is_open BOOLEAN NOT NULL DEFAULT false,
          shifts TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          UNIQUE(restaurant_id, date)
        )
      `);
    }

    console.log('📋 Limpiando horarios antiguos del sistema anterior...');
    await client.query(`
      UPDATE schedules 
      SET shifts = '[]' 
      WHERE shifts IS NOT NULL 
      AND shifts != '[]'
      AND is_open = true
    `);

    console.log('✅ Schema corregido y horarios limpiados exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error corrigiendo schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
