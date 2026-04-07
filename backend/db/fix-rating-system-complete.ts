import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');
console.log('📍 Usando DATABASE_URL:', connectionString.replace(/:[^:]*@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixRatingSystemComplete() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('');
    console.log('🔧 ARREGLANDO SISTEMA DE VALORACIÓN COMPLETO...');
    
    console.log('📋 DROP y CREATE tabla rating_criteria...');
    await client.query(`DROP TABLE IF EXISTS rating_criteria CASCADE;`);
    await client.query(`
      CREATE TABLE rating_criteria (
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
    console.log('✅ Tabla rating_criteria recreada');
    
    console.log('📋 DROP y CREATE tabla no_show_rules...');
    await client.query(`DROP TABLE IF EXISTS no_show_rules CASCADE;`);
    await client.query(`
      CREATE TABLE no_show_rules (
        id TEXT PRIMARY KEY,
        no_shows_required INTEGER NOT NULL,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL DEFAULT 'Usuario bloqueado',
        is_active BOOLEAN DEFAULT true,
        order_num INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla no_show_rules recreada');
    
    console.log('📋 Verificando tabla no_show_config...');
    await client.query(`DROP TABLE IF EXISTS no_show_config CASCADE;`);
    await client.query(`
      CREATE TABLE no_show_config (
        id TEXT PRIMARY KEY,
        occurrence INTEGER NOT NULL UNIQUE,
        block_days INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla no_show_config recreada');
    
    console.log('📋 Verificando tabla client_no_shows...');
    await client.query(`DROP TABLE IF EXISTS client_no_shows CASCADE;`);
    await client.query(`
      CREATE TABLE client_no_shows (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        reservation_token TEXT,
        restaurant_name TEXT,
        reservation_date TEXT,
        reservation_time TEXT,
        guest_count INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deactivated_at TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabla client_no_shows recreada');
    
    console.log('📋 Insertando criterios predeterminados (omitiendo existentes)...');
    await client.query(`
      INSERT INTO rating_criteria (id, name, description, default_value, is_special_criteria, is_active, order_num, created_at, updated_at)
      VALUES 
        ('criteria-punctuality', 'Puntualidad', 'Puntualidad del cliente al llegar a la reserva', 4, false, true, 1, NOW(), NOW()),
        ('criteria-behavior', 'Conducta', 'Comportamiento del cliente durante la estancia', 4, false, true, 2, NOW(), NOW()),
        ('criteria-kindness', 'Amabilidad', 'Amabilidad y trato hacia el personal', 4, false, true, 3, NOW(), NOW()),
        ('criteria-education', 'Educación', 'Educación y modales del cliente', 4, false, true, 4, NOW(), NOW()),
        ('criteria-tip', 'Propina', 'Propina dejada por el cliente', 4, false, true, 5, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ 5 criterios base insertados');
    
    console.log('📋 Insertando reglas de no shows predeterminadas (omitiendo existentes)...');
    await client.query(`
      INSERT INTO no_show_rules (id, no_shows_required, block_days, message, is_active, order_num, created_at, updated_at)
      VALUES 
        ('no-show-rule-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', true, 1, NOW(), NOW()),
        ('no-show-rule-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', true, 2, NOW(), NOW()),
        ('no-show-rule-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', true, 3, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ 3 reglas insertadas');
    
    console.log('📋 Insertando configuración de no shows (omitiendo existentes)...');
    await client.query(`
      INSERT INTO no_show_config (id, occurrence, block_days, message, created_at, updated_at)
      VALUES 
        ('no-show-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
        ('no-show-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
        ('no-show-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', NOW(), NOW())
      ON CONFLICT (occurrence) DO NOTHING;
    `);
    console.log('✅ Configuración predeterminada insertada');
    
    console.log('📋 Verificando y arreglando columnas en tabla clients...');
    
    const basicColumns = [
      { name: 'rating', type: 'DECIMAL(3,2)', default: '0.0' },
      { name: 'total_ratings', type: 'INTEGER', default: '0' },
      { name: 'total_no_shows', type: 'INTEGER', default: '0' },
    ];
    
    for (const column of basicColumns) {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = $1
      `, [column.name]);
      
      if (result.rows.length === 0) {
        await client.query(`ALTER TABLE clients ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default};`);
        console.log(`✅ Columna ${column.name} añadida a clients`);
      } else {
        console.log(`✅ Columna ${column.name} ya existe en clients`);
      }
    }
    
    console.log('📋 Verificando columnas en tabla reservations...');
    const reservationCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name IN ('client_rated', 'client_ratings', 'was_no_show')
    `);
    
    const existingResCols = reservationCols.rows.map(r => r.column_name);
    
    if (!existingResCols.includes('client_rated')) {
      await client.query(`ALTER TABLE reservations ADD COLUMN client_rated BOOLEAN DEFAULT false;`);
      console.log('✅ Columna client_rated añadida a reservations');
    }
    
    if (!existingResCols.includes('client_ratings')) {
      await client.query(`ALTER TABLE reservations ADD COLUMN client_ratings JSONB;`);
      console.log('✅ Columna client_ratings añadida a reservations');
    }
    
    if (!existingResCols.includes('was_no_show')) {
      await client.query(`ALTER TABLE reservations ADD COLUMN was_no_show BOOLEAN DEFAULT false;`);
      console.log('✅ Columna was_no_show añadida a reservations');
    }
    
    console.log('');
    console.log('✅ SISTEMA DE VALORACIÓN ARREGLADO COMPLETAMENTE');
  } catch (error) {
    console.error('❌ Error configurando tablas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRatingSystemComplete().catch(console.error);
