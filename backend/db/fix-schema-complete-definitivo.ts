import { Pool } from 'pg';

console.log('🔧 ARREGLANDO ESQUEMA COMPLETO DE LA BASE DE DATOS...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

console.log('✅ DATABASE_URL encontrada');
console.log(`🔗 Conectando a PostgreSQL...\n`);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📋 1. Arreglando tabla modules...');
    
    await client.query(`
      ALTER TABLE modules 
      ADD COLUMN IF NOT EXISTS icon TEXT,
      ADD COLUMN IF NOT EXISTS color TEXT,
      ADD COLUMN IF NOT EXISTS route TEXT,
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    
    await client.query(`DELETE FROM modules`);
    
    await client.query(`
      INSERT INTO modules (id, name, display_name, description, icon, color, route, display_order, is_active) VALUES
      ('mod-mesas', 'mesas', 'Gestión de Mesas', 'Organiza mesas y ubicaciones', 'LayoutGrid', '#3b82f6', '/restaurant/tables', 1, true),
      ('mod-horarios', 'horarios', 'Horarios y Turnos', 'Configura horarios de servicio', 'Clock', '#10b981', '/restaurant/schedules', 2, true),
      ('mod-reservas', 'reservas', 'Reservas', 'Gestiona reservas online', 'Calendar', '#f59e0b', '/restaurant/reservations', 3, true),
      ('mod-valoraciones', 'valoraciones', 'Valoraciones', 'Valora a tus clientes', 'Star', '#8b5cf6', '/restaurant/ratings', 4, true),
      ('mod-enlaces', 'enlaces', 'Enlaces Personalizados', 'Enlaces en reservas', 'Link', '#ec4899', '/restaurant/config', 5, true)
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        route = EXCLUDED.route,
        display_order = EXCLUDED.display_order
    `);
    console.log('   ✅ Tabla modules arreglada\n');

    console.log('📋 2. Arreglando tabla restaurants...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS min_booking_advance_minutes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS available_high_chairs INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS high_chair_rotation_minutes INTEGER DEFAULT 120,
      ADD COLUMN IF NOT EXISTS table_rotation_time INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS min_modify_cancel_minutes INTEGER DEFAULT 180,
      ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24,
      ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS use_whatsapp_web BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
      ADD COLUMN IF NOT EXISTS send_whatsapp_notifications BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_confirmation_message TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_cancellation_message TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_modification_message TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_reminder_message TEXT,
      ADD COLUMN IF NOT EXISTS whatsapp_custom_message TEXT,
      ADD COLUMN IF NOT EXISTS send_whatsapp_auto BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP
    `);
    console.log('   ✅ Tabla restaurants arreglada\n');

    console.log('📋 3. Arreglando tabla clients...');
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS rating_punctuality DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_behavior DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_communication DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_details TEXT
    `);
    console.log('   ✅ Tabla clients arreglada\n');

    console.log('📋 4. Verificando tabla whatsapp_notifications...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   📋 Creando tabla whatsapp_notifications...');
      await client.query(`
        CREATE TABLE whatsapp_notifications (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          reservation_id TEXT NOT NULL,
          recipient_phone TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          scheduled_for TIMESTAMP NOT NULL,
          status TEXT DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_attempt_at TIMESTAMP,
          sent_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON whatsapp_notifications(status)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled ON whatsapp_notifications(scheduled_for)
      `);
    }
    console.log('   ✅ Tabla whatsapp_notifications verificada\n');

    console.log('📋 5. Verificando tabla cuisine_types...');
    const cuisineCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cuisine_types'
      )
    `);
    
    if (!cuisineCheck.rows[0].exists) {
      console.log('   📋 Creando tabla cuisine_types...');
      await client.query(`
        CREATE TABLE cuisine_types (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE province_cuisine_types (
          id TEXT PRIMARY KEY,
          province_id TEXT NOT NULL,
          cuisine_type_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
          FOREIGN KEY (cuisine_type_id) REFERENCES cuisine_types(id) ON DELETE CASCADE,
          UNIQUE(province_id, cuisine_type_id)
        )
      `);
      
      await client.query(`
        INSERT INTO cuisine_types (id, name) VALUES
        ('cuisine-asador', 'Asador'),
        ('cuisine-furancho', 'Furancho'),
        ('cuisine-sin-gluten', 'Sin Gluten'),
        ('cuisine-marisqueria', 'Marisquería')
        ON CONFLICT (name) DO NOTHING
      `);
    }
    console.log('   ✅ Tabla cuisine_types verificada\n');

    console.log('📋 6. Verificando tabla time_slots...');
    const slotsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'time_slots'
      )
    `);
    
    if (!slotsCheck.rows[0].exists) {
      console.log('   📋 Creando tabla time_slots...');
      await client.query(`
        CREATE TABLE time_slots (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          time TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
        )
      `);
    }
    console.log('   ✅ Tabla time_slots verificada\n');

    console.log('📋 7. Actualizando planes de suscripción con módulos...');
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = '["mod-mesas","mod-horarios","mod-reservas"]'
      WHERE id = 'plan-basico'
    `);
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = '["mod-mesas","mod-horarios","mod-reservas","mod-valoraciones","mod-enlaces"]'
      WHERE id = 'plan-pro'
    `);
    console.log('   ✅ Planes actualizados\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ESQUEMA COMPLETAMENTE ARREGLADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema();
