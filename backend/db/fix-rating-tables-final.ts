import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL as string,
});

async function fixRatingTables() {
  console.log('🔧 Verificando y creando tablas de valoraciones...');
  if (DATABASE_URL) {
    console.log('📍 Usando DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  }

  try {
    // Crear tabla rating_criteria
    console.log('📋 Creando tabla rating_criteria...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rating_criteria (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        default_value INTEGER NOT NULL DEFAULT 4,
        is_special_criteria BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        order_num INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla rating_criteria creada/verificada');

    // Crear tabla no_show_rules
    console.log('📋 Creando tabla no_show_rules...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS no_show_rules (
        id TEXT PRIMARY KEY,
        no_show_count INTEGER NOT NULL,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla no_show_rules creada/verificada');

    // Crear tabla no_show_config
    console.log('📋 Creando tabla no_show_config...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS no_show_config (
        id TEXT PRIMARY KEY,
        occurrence INTEGER NOT NULL UNIQUE,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla no_show_config creada/verificada');

    // Crear tabla client_no_shows si no existe
    console.log('📋 Creando tabla client_no_shows...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_no_shows (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        reservation_id TEXT,
        no_show_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabla client_no_shows creada/verificada');

    // Insertar criterios predeterminados
    console.log('📋 Insertando criterios predeterminados...');
    const criteriaInsert = await pool.query(`
      INSERT INTO rating_criteria (id, name, description, default_value, is_special_criteria, is_active, order_num, created_at, updated_at)
      VALUES 
        ('criteria-punctuality', 'Puntualidad', 'Puntualidad del cliente al llegar a la reserva', 4, false, true, 1, NOW(), NOW()),
        ('criteria-behavior', 'Conducta', 'Comportamiento del cliente durante la estancia', 4, false, true, 2, NOW(), NOW()),
        ('criteria-kindness', 'Amabilidad', 'Amabilidad y trato hacia el personal', 4, false, true, 3, NOW(), NOW()),
        ('criteria-education', 'Educación', 'Educación y modales del cliente', 4, false, true, 4, NOW(), NOW()),
        ('criteria-tip', 'Propina', 'Propina dejada por el cliente', 4, false, true, 5, NOW(), NOW()),
        ('criteria-no-show', 'No Shows', 'Cliente no se presentó a la reserva', 0, true, true, 6, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    console.log(`✅ ${criteriaInsert.rowCount || 0} criterios insertados (omitidos los existentes)`);

    // Insertar reglas de no shows predeterminadas
    console.log('📋 Insertando reglas de no shows predeterminadas...');
    const rulesInsert = await pool.query(`
      INSERT INTO no_show_rules (id, no_show_count, block_days, message, is_active, created_at, updated_at)
      VALUES 
        ('no-show-rule-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', true, NOW(), NOW()),
        ('no-show-rule-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', true, NOW(), NOW()),
        ('no-show-rule-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    console.log(`✅ ${rulesInsert.rowCount || 0} reglas insertadas (omitidas las existentes)`);

    // Insertar configuración de No Shows predeterminada
    console.log('📋 Insertando configuración de no shows...');
    const configInsert = await pool.query(`
      INSERT INTO no_show_config (id, occurrence, block_days, message, created_at, updated_at)
      VALUES 
        ('no-show-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
        ('no-show-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
        ('no-show-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', NOW(), NOW())
      ON CONFLICT (occurrence) DO NOTHING
      RETURNING id;
    `);
    console.log(`✅ ${configInsert.rowCount || 0} configuraciones insertadas (omitidas las existentes)`);

    // Verificar las tablas
    const criteriaCount = await pool.query('SELECT COUNT(*) FROM rating_criteria');
    const rulesCount = await pool.query('SELECT COUNT(*) FROM no_show_rules');
    const configCount = await pool.query('SELECT COUNT(*) FROM no_show_config');
    const noShowsCount = await pool.query('SELECT COUNT(*) FROM client_no_shows');

    console.log(`\n✅ Verificación completada:`);
    console.log(`   - Criterios de valoración: ${criteriaCount.rows[0].count}`);
    console.log(`   - Reglas de no shows: ${rulesCount.rows[0].count}`);
    console.log(`   - Configuración de no shows: ${configCount.rows[0].count}`);
    console.log(`   - No shows registrados: ${noShowsCount.rows[0].count}`);

    console.log('\n🎉 Tablas de valoraciones configuradas correctamente');

  } catch (error) {
    console.error('❌ Error configurando tablas:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixRatingTables();
