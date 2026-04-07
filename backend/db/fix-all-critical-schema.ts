import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function fixAllCriticalSchema() {
  console.log('🔧 CORRIGIENDO SCHEMA DE BASE DE DATOS...');
  console.log('==========================================\n');

  try {
    console.log('📋 1. Añadiendo columnas de rating a reservations...');
    await pool.query(`
      DO $$ 
      BEGIN
        -- Columnas de rating detallado
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rating_punctuality'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rating_punctuality DECIMAL(2,1) DEFAULT 4.0;
          RAISE NOTICE 'Columna rating_punctuality añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rating_behavior'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rating_behavior DECIMAL(2,1) DEFAULT 4.0;
          RAISE NOTICE 'Columna rating_behavior añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rating_kindness'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rating_kindness DECIMAL(2,1) DEFAULT 4.0;
          RAISE NOTICE 'Columna rating_kindness añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rating_education'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rating_education DECIMAL(2,1) DEFAULT 4.0;
          RAISE NOTICE 'Columna rating_education añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rating_tip'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rating_tip DECIMAL(2,1) DEFAULT 4.0;
          RAISE NOTICE 'Columna rating_tip añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'client_rated'
        ) THEN
          ALTER TABLE reservations ADD COLUMN client_rated BOOLEAN DEFAULT FALSE;
          RAISE NOTICE 'Columna client_rated añadida';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'reservations' AND column_name = 'rated_at'
        ) THEN
          ALTER TABLE reservations ADD COLUMN rated_at TIMESTAMP;
          RAISE NOTICE 'Columna rated_at añadida';
        END IF;
      END $$;
    `);
    console.log('✅ Columnas de rating añadidas\n');

    console.log('📋 2. Verificando estructura de clients...');
    const clientsCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de clients:', clientsCheck.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    console.log('\n📋 3. Verificando datos de clients...');
    const clientsData = await pool.query(`
      SELECT 
        id, 
        name, 
        email, 
        phone, 
        rating, 
        total_ratings,
        rating_punctuality,
        rating_behavior,
        rating_kindness,
        rating_education,
        rating_tip,
        created_at
      FROM clients 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(`Total clientes: ${clientsData.rows.length}`);
    clientsData.rows.forEach(client => {
      console.log(`  - ${client.name} (${client.phone}): Rating ${client.rating}, Total: ${client.total_ratings}`);
    });

    console.log('\n📋 4. Actualizando ratings de clientes desde reservations...');
    await pool.query(`
      UPDATE clients c
      SET 
        rating_punctuality = COALESCE((
          SELECT AVG(r.rating_punctuality) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0),
        rating_behavior = COALESCE((
          SELECT AVG(r.rating_behavior) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0),
        rating_kindness = COALESCE((
          SELECT AVG(r.rating_kindness) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0),
        rating_education = COALESCE((
          SELECT AVG(r.rating_education) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0),
        rating_tip = COALESCE((
          SELECT AVG(r.rating_tip) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0),
        total_ratings = COALESCE((
          SELECT COUNT(*) 
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 0),
        rating = COALESCE((
          SELECT AVG((
            r.rating_punctuality + 
            r.rating_behavior + 
            r.rating_kindness + 
            r.rating_education + 
            r.rating_tip
          ) / 5.0)
          FROM reservations r 
          WHERE r.client_id = c.id AND r.client_rated = true
        ), 4.0)
    `);
    console.log('✅ Ratings actualizados\n');

    console.log('📋 5. Verificando day_exceptions...');
    const exceptionsCheck = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        date,
        is_open,
        template_ids
      FROM day_exceptions
      ORDER BY date DESC
      LIMIT 3
    `);
    console.log(`Total excepciones: ${exceptionsCheck.rows.length}`);
    exceptionsCheck.rows.forEach(exc => {
      console.log(`  - ${exc.date}: isOpen=${exc.is_open}, shifts=${typeof exc.template_ids === 'string' ? exc.template_ids.substring(0, 50) : JSON.stringify(exc.template_ids).substring(0, 50)}...`);
    });

    console.log('\n✅ CORRECCIÓN COMPLETADA CON ÉXITO\n');
    console.log('Cambios aplicados:');
    console.log('  ✅ Columnas de rating añadidas a reservations');
    console.log('  ✅ Ratings de clientes actualizados');
    console.log('  ✅ Schema verificado\n');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixAllCriticalSchema();
