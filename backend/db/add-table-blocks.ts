import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db';

async function addTableBlocksTable() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔧 Creando tabla de bloqueos de mesas...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS table_blocks (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_table_blocks_restaurant ON table_blocks(restaurant_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_table_blocks_time ON table_blocks(start_time, end_time);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_table_blocks_table ON table_blocks(table_id);
    `);

    console.log('✅ Tabla de bloqueos de mesas creada exitosamente');

  } catch (error) {
    console.error('❌ Error creando tabla de bloqueos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addTableBlocksTable()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
