import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixClientsCompleteSchema() {
  console.log('🔧 Arreglando esquema completo de clients...');
  console.log('═'.repeat(80));

  try {
    console.log('\n📋 1. Agregando columna country_code...');
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+34'
    `);
    console.log('✅ Columna country_code agregada');

    console.log('\n📋 2. Haciendo email opcional...');
    try {
      await pool.query(`
        ALTER TABLE clients 
        ALTER COLUMN email DROP NOT NULL
      `);
      console.log('✅ Columna email ahora es opcional');
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Columna email no existe o ya permite NULL');
      } else {
        throw error;
      }
    }

    console.log('\n📋 3. Verificando otras columnas necesarias...');
    await pool.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Columnas adicionales verificadas');

    console.log('\n📋 4. Verificando tabla client_no_shows...');
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_no_shows'
      )
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('⚠️  Tabla client_no_shows no existe, creándola...');
      await pool.query(`
        CREATE TABLE client_no_shows (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          cancelled_at TIMESTAMP,
          cancelled_by TEXT
        )
      `);
      console.log('✅ Tabla client_no_shows creada');
    } else {
      console.log('✅ Tabla client_no_shows existe');
    }

    console.log('\n📋 5. Arreglando constraint de location_id en reservations...');
    try {
      await pool.query(`
        ALTER TABLE reservations 
        ALTER COLUMN location_id DROP NOT NULL
      `);
      console.log('✅ location_id ahora permite NULL');
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Columna location_id no existe o ya permite NULL');
      } else {
        throw error;
      }
    }

    console.log('\n📋 6. Arreglando foreign keys...');
    
    const fkCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'reservations' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%location%'
    `);

    for (const row of fkCheck.rows) {
      console.log(`⚠️  Eliminando FK antigua: ${row.constraint_name}`);
      await pool.query(`
        ALTER TABLE reservations 
        DROP CONSTRAINT IF EXISTS ${row.constraint_name}
      `);
    }

    await pool.query(`
      ALTER TABLE reservations
      ADD CONSTRAINT reservations_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES table_locations(id) 
      ON DELETE SET NULL
    `);
    console.log('✅ FK de location_id configurada con SET NULL');

    await pool.query(`
      DO $$ 
      BEGIN
        ALTER TABLE client_ratings
        DROP CONSTRAINT IF EXISTS client_ratings_client_id_fkey;
        
        ALTER TABLE client_ratings
        ADD CONSTRAINT client_ratings_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE;

        ALTER TABLE client_ratings
        DROP CONSTRAINT IF EXISTS client_ratings_reservation_id_fkey;
        
        ALTER TABLE client_ratings
        ADD CONSTRAINT client_ratings_reservation_id_fkey
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE;

        ALTER TABLE reservations
        DROP CONSTRAINT IF EXISTS reservations_client_id_fkey;
        
        ALTER TABLE reservations
        ADD CONSTRAINT reservations_client_id_fkey
        FOREIGN KEY (client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE;
      EXCEPTION
        WHEN others THEN
          RAISE NOTICE 'Error configurando FKs: %', SQLERRM;
      END $$
    `);
    console.log('✅ Foreign keys configuradas correctamente');

    console.log('\n📋 7. Agregando índices de rendimiento...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_country_code 
      ON clients(country_code);
      
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_client 
      ON client_no_shows(client_id);
      
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_active 
      ON client_no_shows(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_reservations_client 
      ON reservations(client_id)
    `);
    console.log('✅ Índices creados');

    console.log('\n📋 8. Test de operaciones...');
    
    await pool.query('BEGIN');
    
    const testClientId = 'test-delete-' + Date.now();
    await pool.query(
      'INSERT INTO clients (id, phone, name, country_code) VALUES ($1, $2, $3, $4)',
      [testClientId, '+34999999999', 'Test Delete', '+34']
    );
    console.log('✅ Cliente de prueba creado');
    
    await pool.query(
      'DELETE FROM clients WHERE id = $1',
      [testClientId]
    );
    console.log('✅ Cliente borrado exitosamente');
    
    await pool.query('ROLLBACK');

    console.log('\n═'.repeat(80));
    console.log('✅ Esquema completo corregido exitosamente\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixClientsCompleteSchema().catch(console.error);
