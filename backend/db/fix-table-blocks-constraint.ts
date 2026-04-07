import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db';

async function fixTableBlocksConstraint() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('🔧 Arreglando constraint de table_blocks...');

    await pool.query('DROP TABLE IF EXISTS table_blocks CASCADE');

    await pool.query(`
      CREATE TABLE table_blocks (
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
        FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE
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

    console.log('✅ Constraint de table_blocks arreglado correctamente');

  } catch (error) {
    console.error('❌ Error arreglando constraint:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixTableBlocksConstraint()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
