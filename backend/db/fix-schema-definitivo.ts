import { Pool } from 'pg';

console.log('🔧 Arreglando esquema definitivamente...');
console.log('════════════════════════════════════════════════════════════════════════════════');

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

    console.log('\n📋 1. Arreglando tabla clients...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    // Verificar si country_code existe
    const countryCodeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'country_code'
    `);
    
    if (countryCodeCheck.rows.length === 0) {
      console.log('➕ Agregando columna country_code...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN country_code TEXT DEFAULT '+34'
      `);
      console.log('✅ Columna country_code agregada');
    } else {
      console.log('✅ Columna country_code ya existe');
    }

    // Hacer email nullable
    console.log('🔧 Haciendo email nullable...');
    await client.query(`
      ALTER TABLE clients 
      ALTER COLUMN email DROP NOT NULL
    `);
    console.log('✅ email ahora permite NULL');

    // Crear índice en phone si no existe
    console.log('📊 Verificando índice en phone...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)
    `);
    console.log('✅ Índice en phone verificado');

    console.log('\n📋 2. Creando/verificando tabla client_no_shows...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_no_shows (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        guests INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla client_no_shows verificada/creada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_client ON client_no_shows(client_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_client_no_shows_active ON client_no_shows(is_active)
    `);
    console.log('✅ Índices de client_no_shows creados');

    console.log('\n📋 3. Arreglando tabla reservations...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    // Hacer location_id nullable
    console.log('🔧 Haciendo location_id nullable...');
    await client.query(`
      ALTER TABLE reservations 
      ALTER COLUMN location_id DROP NOT NULL
    `);
    console.log('✅ location_id ahora permite NULL');

    // Agregar cancelled_by si no existe
    const cancelledByCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'cancelled_by'
    `);
    
    if (cancelledByCheck.rows.length === 0) {
      console.log('➕ Agregando columna cancelled_by...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN cancelled_by TEXT
      `);
      console.log('✅ Columna cancelled_by agregada');
    } else {
      console.log('✅ Columna cancelled_by ya existe');
    }

    console.log('\n📋 4. Arreglando foreign keys...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    // Eliminar FK antigua de location_id si existe
    console.log('🔧 Eliminando FK antigua de location_id...');
    await client.query(`
      ALTER TABLE reservations 
      DROP CONSTRAINT IF EXISTS reservations_location_id_fkey
    `);
    console.log('✅ FK antigua eliminada');

    // Crear nueva FK con SET NULL
    console.log('🔧 Creando nueva FK con SET NULL...');
    await client.query(`
      ALTER TABLE reservations 
      ADD CONSTRAINT reservations_location_id_fkey 
      FOREIGN KEY (location_id) 
      REFERENCES table_locations(id) 
      ON DELETE SET NULL
    `);
    console.log('✅ FK de location_id configurada con SET NULL');

    // Verificar otras FK críticas
    console.log('🔍 Verificando FK de client_id...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'reservations_client_id_fkey'
        ) THEN
          ALTER TABLE reservations 
          ADD CONSTRAINT reservations_client_id_fkey 
          FOREIGN KEY (client_id) 
          REFERENCES clients(id) 
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ FK de client_id verificada');

    console.log('\n📋 5. Creando tabla no_show_rules...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS no_show_rules (
        id TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla no_show_rules creada/verificada');

    console.log('\n📋 6. Agregando índices de rendimiento...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations(client_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(confirmation_token)
    `);
    console.log('✅ Índices de rendimiento creados');

    console.log('\n📋 7. Test de operaciones críticas...');
    console.log('────────────────────────────────────────────────────────────────────────────────');
    
    // Test 1: Crear cliente de prueba
    console.log('🧪 Test 1: Crear cliente...');
    const testClientId = `test-client-${Date.now()}`;
    await client.query('BEGIN');
    try {
      await client.query(`
        INSERT INTO clients (id, name, phone, country_code, rating, total_ratings, no_show_count, is_blocked, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [testClientId, 'Test Client', '+34999999999', '+34', 4.0, 0, 0, false, new Date()]);
      console.log('✅ Cliente creado correctamente');
      
      // Test 2: Borrar cliente
      console.log('🧪 Test 2: Borrar cliente...');
      await client.query('DELETE FROM clients WHERE id = $1', [testClientId]);
      console.log('✅ Cliente eliminado correctamente');
      
      await client.query('ROLLBACK');
      console.log('✅ Tests completados (rollback realizado)');
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Error en tests:', error.message);
      throw error;
    }

    // Test 3: Crear y cancelar reserva
    console.log('🧪 Test 3: Verificar cancelación de reservas...');
    const testReservations = await client.query(`
      SELECT id FROM reservations WHERE status = 'pending' LIMIT 1
    `);
    
    if (testReservations.rows.length > 0) {
      const testResId = testReservations.rows[0].id;
      await client.query('BEGIN');
      try {
        await client.query(`
          UPDATE reservations 
          SET status = $1, cancelled_by = $2, updated_at = $3
          WHERE id = $4
        `, ['cancelled', 'test', new Date(), testResId]);
        console.log('✅ Reserva actualizada correctamente');
        await client.query('ROLLBACK');
        console.log('✅ Test de cancelación completado (rollback realizado)');
      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('❌ Error en test de cancelación:', error.message);
      }
    } else {
      console.log('⚠️  No hay reservas pending para probar');
    }

    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('✅ ESQUEMA ARREGLADO COMPLETAMENTE');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('\n📝 Resumen de cambios aplicados:');
    console.log('   ✅ Columna country_code agregada a clients');
    console.log('   ✅ Campo email ahora permite NULL');
    console.log('   ✅ Tabla client_no_shows creada/verificada');
    console.log('   ✅ Campo location_id ahora permite NULL');
    console.log('   ✅ Columna cancelled_by agregada a reservations');
    console.log('   ✅ Foreign keys configuradas correctamente');
    console.log('   ✅ Tabla no_show_rules creada');
    console.log('   ✅ Índices de rendimiento agregados');
    console.log('   ✅ Tests de operaciones completados exitosamente');

  } catch (error) {
    console.error('\n❌ Error durante la corrección del esquema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
