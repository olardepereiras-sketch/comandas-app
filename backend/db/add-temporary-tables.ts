import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservamesa';

async function addTemporaryTablesSystem() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('🔌 Conectado a la base de datos');

    console.log('📊 Creando tabla de mesas temporales...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS temporary_tables (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        original_table_id TEXT,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        high_chairs INTEGER DEFAULT 0,
        allows_stroller BOOLEAN DEFAULT false,
        allows_pets BOOLEAN DEFAULT false,
        type TEXT NOT NULL CHECK (type IN ('split_a', 'split_b', 'grouped')),
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      );
    `);

    console.log('📊 Creando índices para mesas temporales...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_temporary_tables_reservation 
      ON temporary_tables(reservation_id);
      
      CREATE INDEX IF NOT EXISTS idx_temporary_tables_location 
      ON temporary_tables(location_id);
      
      CREATE INDEX IF NOT EXISTS idx_temporary_tables_original 
      ON temporary_tables(original_table_id);
    `);

    console.log('✅ Sistema de mesas temporales creado correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addTemporaryTablesSystem().catch(console.error);
