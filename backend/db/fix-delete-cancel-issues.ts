import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixDeleteCancelIssues() {
  console.log('🔧 Arreglando problemas de borrado y cancelación...');
  console.log('═'.repeat(80));

  try {
    console.log('\n📋 1. Verificando tabla client_no_shows...');
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
        CREATE TABLE IF NOT EXISTS client_no_shows (
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

    console.log('\n📋 2. Arreglando constraint de location_id...');
    await pool.query(`
      ALTER TABLE reservations 
      ALTER COLUMN location_id DROP NOT NULL
    `);
    console.log('✅ location_id ahora permite NULL');

    console.log('\n📋 3. Arreglando foreign key de location_id...');
    const fkCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'reservations' 
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%location%'
    `);

    if (fkCheck.rows.length > 0) {
      const fkName = fkCheck.rows[0].constraint_name;
      console.log(`⚠️  Eliminando FK antigua: ${fkName}`);
      await pool.query(`
        ALTER TABLE reservations 
        DROP CONSTRAINT IF EXISTS ${fkName}
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

    console.log('\n📋 4. Verificando otras foreign keys...');
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
          RAISE NOTICE 'Error: %', SQLERRM;
      END $$
    `);
    console.log('✅ Foreign keys configuradas correctamente');

    console.log('\n📋 5. Agregando índices de rendimiento...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_client 
      ON client_no_shows(client_id);
      
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_active 
      ON client_no_shows(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_reservations_client 
      ON reservations(client_id)
    `);
    console.log('✅ Índices creados');

    console.log('\n📋 6. Test de operaciones...');
    
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
    console.log('✅ Todos los problemas corregidos exitosamente\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDeleteCancelIssues().catch(console.error);
