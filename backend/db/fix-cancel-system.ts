import { Pool } from 'pg';

console.log('🔧 ARREGLANDO SISTEMA DE CANCELACIÓN...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');
console.log(`📍 Usando DATABASE_URL: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixCancelSystem() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecada con PostgreSQL\n');

    console.log('🔧 PASO 1: Verificando y agregando columna cancelled_by...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'cancelled_by'
        ) THEN
          ALTER TABLE reservations ADD COLUMN cancelled_by TEXT;
          RAISE NOTICE 'Columna cancelled_by agregada';
        ELSE
          RAISE NOTICE 'Columna cancelled_by ya existe';
        END IF;
      END $$;
    `);
    console.log('✅ Columna cancelled_by verificada\n');

    console.log('🔧 PASO 2: Verificando columna updated_at en clients...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clients' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE clients ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
          RAISE NOTICE 'Columna updated_at agregada a clients';
        ELSE
          RAISE NOTICE 'Columna updated_at ya existe en clients';
        END IF;
      END $$;
    `);
    console.log('✅ Columna updated_at en clients verificada\n');

    console.log('🔧 PASO 3: Verificando columna total_no_shows en clients...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'clients' AND column_name = 'total_no_shows'
        ) THEN
          ALTER TABLE clients ADD COLUMN total_no_shows INTEGER DEFAULT 0;
          RAISE NOTICE 'Columna total_no_shows agregada a clients';
        ELSE
          RAISE NOTICE 'Columna total_no_shows ya existe en clients';
        END IF;
      END $$;
    `);
    console.log('✅ Columna total_no_shows en clients verificada\n');

    console.log('🔧 PASO 4: Verificando índices para optimizar búsquedas...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_status 
      ON reservations(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date 
      ON reservations(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date 
      ON reservations(restaurant_id, date);
    `);
    console.log('✅ Índices creados/verificados\n');

    console.log('✅ SISTEMA DE CANCELACIÓN ARREGLADO COMPLETAMENTE');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCancelSystem()
  .then(() => {
    console.log('✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
