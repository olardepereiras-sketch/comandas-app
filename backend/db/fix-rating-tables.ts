import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixRatingTables() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    
    console.log('🔍 Verificando tabla rating_criteria...');
    const ratingCriteriaExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'rating_criteria'
      );
    `);
    
    if (!ratingCriteriaExists.rows[0].exists) {
      console.log('➕ Creando tabla rating_criteria...');
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
      console.log('✅ Tabla rating_criteria creada');
      
      console.log('➕ Insertando criterios predeterminados...');
      await client.query(`
        INSERT INTO rating_criteria (id, name, description, default_value, is_special_criteria, is_active, order_num, created_at, updated_at)
        VALUES 
          ('criteria-punctuality', 'Puntualidad', 'Puntualidad del cliente al llegar a la reserva', 4, false, true, 1, NOW(), NOW()),
          ('criteria-behavior', 'Conducta', 'Comportamiento del cliente durante la estancia', 4, false, true, 2, NOW(), NOW()),
          ('criteria-kindness', 'Amabilidad', 'Amabilidad y trato hacia el personal', 4, false, true, 3, NOW(), NOW()),
          ('criteria-education', 'Educación', 'Educación y modales del cliente', 4, false, true, 4, NOW(), NOW()),
          ('criteria-tip', 'Propina', 'Propina dejada por el cliente', 4, false, true, 5, NOW(), NOW()),
          ('criteria-no-show', 'No Shows', 'Cliente no se presentó a la reserva', 0, true, true, 6, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Criterios predeterminados insertados');
    } else {
      console.log('✅ Tabla rating_criteria ya existe');
    }
    
    console.log('🔍 Verificando tabla no_show_rules...');
    const noShowRulesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'no_show_rules'
      );
    `);
    
    if (!noShowRulesExists.rows[0].exists) {
      console.log('➕ Creando tabla no_show_rules...');
      await client.query(`
        CREATE TABLE no_show_rules (
          id TEXT PRIMARY KEY,
          no_show_count INTEGER NOT NULL,
          block_days INTEGER NOT NULL,
          message TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabla no_show_rules creada');
      
      console.log('➕ Insertando reglas predeterminadas...');
      await client.query(`
        INSERT INTO no_show_rules (id, no_show_count, block_days, message, is_active, created_at, updated_at)
        VALUES 
          ('no-show-rule-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', true, NOW(), NOW()),
          ('no-show-rule-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', true, NOW(), NOW()),
          ('no-show-rule-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', true, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Reglas predeterminadas insertadas');
    } else {
      console.log('✅ Tabla no_show_rules ya existe');
    }
    
    console.log('🔍 Verificando tabla client_no_shows...');
    const clientNoShowsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'client_no_shows'
      );
    `);
    
    if (!clientNoShowsExists.rows[0].exists) {
      console.log('➕ Creando tabla client_no_shows...');
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
      console.log('✅ Tabla client_no_shows creada');
    } else {
      console.log('✅ Tabla client_no_shows ya existe');
    }
    
    console.log('🔍 Verificando tabla no_show_config...');
    const noShowConfigExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'no_show_config'
      );
    `);
    
    if (!noShowConfigExists.rows[0].exists) {
      console.log('➕ Creando tabla no_show_config...');
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
      console.log('✅ Tabla no_show_config creada');
      
      console.log('➕ Insertando configuración predeterminada...');
      await client.query(`
        INSERT INTO no_show_config (id, occurrence, block_days, message, created_at, updated_at)
        VALUES 
          ('no-show-1', 1, 7, 'Este usuario está bloqueado por no presentarse a una reserva. Es la primera vez y tendrá un bloqueo semanal. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
          ('no-show-2', 2, 30, 'Este usuario está bloqueado por no presentarse a una reserva. Es la segunda vez y tendrá un bloqueo mensual. En futuras ocasiones el bloqueo será muy superior.', NOW(), NOW()),
          ('no-show-3', 3, 365, 'Este usuario está bloqueado por no presentarse a una reserva. Ya ha sufrido varios bloqueos y no podrá utilizar esta plataforma durante un año.', NOW(), NOW())
        ON CONFLICT (occurrence) DO NOTHING;
      `);
      console.log('✅ Configuración predeterminada insertada');
    } else {
      console.log('✅ Tabla no_show_config ya existe');
    }
    
    console.log('');
    console.log('✅ Todas las tablas de valoración verificadas y creadas exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixRatingTables().catch(console.error);
