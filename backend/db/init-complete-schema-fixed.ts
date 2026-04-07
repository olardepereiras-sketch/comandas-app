import { Pool } from 'pg';
import { execSync } from 'child_process';

const FORCE_DROP = process.argv.includes('--force-drop');
const FORCE_DROP_CONFIRM = process.argv.includes('--yes-i-am-sure');

console.log('🔄 Iniciando creación COMPLETA del esquema de PostgreSQL...');
console.log('🛡️  MODO SEGURO: Solo se crearán tablas que no existan. Los datos existentes NO se tocarán.');
if (FORCE_DROP) {
  console.log('');
  console.log('⚠️⚠️⚠️  ATENCIÓN: Se ha solicitado --force-drop');
  console.log('   Esto ELIMINARÁ TODAS LAS TABLAS Y TODOS LOS DATOS.');
  if (!FORCE_DROP_CONFIRM) {
    console.log('');
    console.log('❌ Para confirmar el borrado, debes añadir --yes-i-am-sure');
    console.log('   Comando completo: bun run backend/db/init-complete-schema-fixed.ts --force-drop --yes-i-am-sure');
    console.log('');
    console.log('💡 Si solo quieres crear tablas nuevas sin borrar datos, ejecuta sin --force-drop:');
    console.log('   bun run backend/db/init-complete-schema-fixed.ts');
    process.exit(1);
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  console.log('   Formato: postgresql://usuario:contraseña@localhost:5432/nombre_bd');
  process.exit(1);
}

console.log(`🔗 Conectando a PostgreSQL...`);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initCompleteSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    const existingTables = await client.query(
      `SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableCount = parseInt(existingTables.rows[0].count, 10);
    console.log(`📊 Tablas existentes en la base de datos: ${tableCount}`);

    if (FORCE_DROP && FORCE_DROP_CONFIRM) {
      console.log('');
      console.log('🧹 MODO FORCE-DROP CONFIRMADO: Eliminando tablas existentes...');
      
      if (tableCount > 0) {
        console.log('💾 Haciendo backup automático antes de borrar...');
        try {
          execSync(
            '/var/www/reservamesa/backup-database.sh manual',
            { stdio: 'inherit', timeout: 30000 }
          );
          console.log('✅ Backup automático completado');
        } catch (backupError) {
          console.log('⚠️  No se pudo hacer backup automático (el script puede no existir)');
          console.log('   Continuando con el borrado...');
        }
      }
    } else {
      console.log('📋 Verificando y creando tablas que no existan (modo seguro)...');
    }

    if (FORCE_DROP && FORCE_DROP_CONFIRM) {
      await client.query('DROP TABLE IF EXISTS whatsapp_notifications CASCADE');
      await client.query('DROP TABLE IF EXISTS time_slots CASCADE');
      await client.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
      await client.query('DROP TABLE IF EXISTS modules CASCADE');
      await client.query('DROP TABLE IF EXISTS no_show_rules CASCADE');
      await client.query('DROP TABLE IF EXISTS client_no_shows CASCADE');
      await client.query('DROP TABLE IF EXISTS province_cuisine_types CASCADE');
      await client.query('DROP TABLE IF EXISTS cuisine_types CASCADE');
      await client.query('DROP TABLE IF EXISTS verification_codes CASCADE');
      await client.query('DROP TABLE IF EXISTS auth_sessions CASCADE');
      await client.query('DROP TABLE IF EXISTS client_ratings CASCADE');
      await client.query('DROP TABLE IF EXISTS rating_criteria CASCADE');
      await client.query('DROP TABLE IF EXISTS reservations CASCADE');
      await client.query('DROP TABLE IF EXISTS table_groups CASCADE');
      await client.query('DROP TABLE IF EXISTS tables CASCADE');
      await client.query('DROP TABLE IF EXISTS table_locations CASCADE');
      await client.query('DROP TABLE IF EXISTS day_exceptions CASCADE');
      await client.query('DROP TABLE IF EXISTS shift_templates CASCADE');
      await client.query('DROP TABLE IF EXISTS schedules CASCADE');
      await client.query('DROP TABLE IF EXISTS clients CASCADE');
      await client.query('DROP TABLE IF EXISTS restaurants CASCADE');
      await client.query('DROP TABLE IF EXISTS subscription_durations CASCADE');
      await client.query('DROP TABLE IF EXISTS subscription_plans CASCADE');
      await client.query('DROP TABLE IF EXISTS cities CASCADE');
      await client.query('DROP TABLE IF EXISTS provinces CASCADE');
      await client.query('DROP TABLE IF EXISTS admin_users CASCADE');
      await client.query('DROP TABLE IF EXISTS sales_representatives CASCADE');
    }

    console.log('📋 Creando tabla provinces...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS provinces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla cities...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        province_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla subscription_plans...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        enabled_modules TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla subscription_durations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_durations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        months INTEGER NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla restaurants...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        username TEXT,
        password TEXT,
        last_ip TEXT,
        profile_image_url TEXT,
        google_maps_url TEXT,
        cuisine_type TEXT NOT NULL,
        address TEXT NOT NULL,
        postal_code TEXT,
        city_id TEXT NOT NULL,
        province_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        subscription_plan_id TEXT,
        subscription_duration_id TEXT,
        subscription_start TIMESTAMP,
        subscription_expiry TIMESTAMP NOT NULL,
        subscription_duration_months INTEGER DEFAULT 12,
        enabled_modules TEXT NOT NULL,
        advance_booking_days INTEGER NOT NULL DEFAULT 30,
        custom_links TEXT,
        min_booking_advance_minutes INTEGER DEFAULT 0,
        available_high_chairs INTEGER DEFAULT 0,
        high_chair_rotation_minutes INTEGER DEFAULT 120,
        table_rotation_time INTEGER DEFAULT 100,
        min_modify_cancel_minutes INTEGER DEFAULT 180,
        reminder1_enabled BOOLEAN DEFAULT false,
        reminder1_hours INTEGER DEFAULT 24,
        reminder2_enabled BOOLEAN DEFAULT false,
        reminder2_minutes INTEGER DEFAULT 60,
        use_whatsapp_web BOOLEAN DEFAULT false,
        whatsapp_number TEXT,
        send_whatsapp_notifications BOOLEAN DEFAULT false,
        whatsapp_confirmation_message TEXT,
        whatsapp_cancellation_message TEXT,
        whatsapp_modification_message TEXT,
        whatsapp_reminder_message TEXT,
        whatsapp_custom_message TEXT,
        send_whatsapp_auto BOOLEAN DEFAULT false,
        auto_send_whatsapp BOOLEAN DEFAULT false,
        enable_email_notifications BOOLEAN DEFAULT false,
        notification_phones TEXT,
        notification_email TEXT,
        sales_rep_id TEXT,
        terms_accepted_at TIMESTAMP,
        important_message_enabled BOOLEAN DEFAULT false,
        important_message TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (city_id) REFERENCES cities(id),
        FOREIGN KEY (province_id) REFERENCES provinces(id),
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id),
        FOREIGN KEY (subscription_duration_id) REFERENCES subscription_durations(id)
      )
    `);

    console.log('📋 Creando tabla clients...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        rating DECIMAL(3,2) NOT NULL DEFAULT 4.0,
        total_ratings INTEGER NOT NULL DEFAULT 0,
        rating_details TEXT,
        no_show_count INTEGER NOT NULL DEFAULT 0,
        is_blocked BOOLEAN NOT NULL DEFAULT false,
        blocked_until TIMESTAMP,
        user_status TEXT DEFAULT 'user_new',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla table_locations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_locations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT,
        order_num INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        table_number INTEGER,
        name TEXT NOT NULL,
        seats INTEGER,
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        allows_high_chairs BOOLEAN NOT NULL DEFAULT true,
        allows_strollers BOOLEAN NOT NULL DEFAULT true,
        allows_pets BOOLEAN NOT NULL DEFAULT true,
        priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 9),
        order_num INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla table_groups...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_groups (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        location_id TEXT,
        table_ids TEXT[] NOT NULL,
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        priority INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla shift_templates...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_templates (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        time_slots TEXT NOT NULL,
        max_guests_per_hour INTEGER DEFAULT 10,
        min_rating DECIMAL(3,2) DEFAULT 0,
        min_local_rating DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla schedules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        is_open BOOLEAN NOT NULL DEFAULT true,
        shifts TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla day_exceptions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS day_exceptions (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        date DATE NOT NULL,
        is_open BOOLEAN NOT NULL DEFAULT false,
        enabled_shift_ids TEXT,
        shifts TEXT,
        max_guests_per_shift TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, date)
      )
    `);

    console.log('📋 Creando tabla reservations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location_id TEXT NOT NULL,
        location_name TEXT DEFAULT '',
        table_ids TEXT NOT NULL,
        needs_high_chair BOOLEAN NOT NULL DEFAULT false,
        high_chair_count INTEGER DEFAULT 0,
        needs_stroller BOOLEAN NOT NULL DEFAULT false,
        has_pets BOOLEAN NOT NULL DEFAULT false,
        is_group BOOLEAN DEFAULT false,
        group_id TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        client_phone TEXT DEFAULT '',
        client_name TEXT DEFAULT '',
        client_email TEXT DEFAULT '',
        client_notes TEXT DEFAULT '',
        confirmation_token TEXT NOT NULL,
        confirmation_token2 TEXT,
        token TEXT,
        pending_expires_at TIMESTAMP,
        is_new_client BOOLEAN DEFAULT false,
        client_rated BOOLEAN DEFAULT false,
        rating_deadline TIMESTAMP,
        deleted_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES table_locations(id)
      )
    `);

    console.log('📋 Creando tabla rating_criteria...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rating_criteria (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        default_value INTEGER NOT NULL DEFAULT 4,
        is_special_criteria BOOLEAN NOT NULL DEFAULT false,
        special_criteria_config TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla client_ratings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_ratings (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        ratings TEXT NOT NULL,
        private_comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla client_no_shows...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_no_shows (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla cuisine_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cuisine_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla province_cuisine_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS province_cuisine_types (
        id TEXT PRIMARY KEY,
        province_id TEXT NOT NULL,
        cuisine_type_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
        FOREIGN KEY (cuisine_type_id) REFERENCES cuisine_types(id) ON DELETE CASCADE,
        UNIQUE(province_id, cuisine_type_id)
      )
    `);

    console.log('📋 Creando tabla modules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla restaurant_modules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_modules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, module_id)
      )
    `);

    console.log('📋 Creando tabla no_show_rules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS no_show_rules (
        id TEXT PRIMARY KEY,
        no_shows_required INTEGER NOT NULL,
        block_duration_days INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla time_slots...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        time TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla whatsapp_notifications...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_notifications (
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

    console.log('📋 Creando tabla sales_representatives...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_representatives (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        new_client_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        first_renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla admin_users...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        last_ip TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla auth_sessions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla verification_codes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        code TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando índices para mejorar rendimiento...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_province ON restaurants(province_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_token ON reservations(token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tables_location ON tables(location_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_table_locations_restaurant ON table_locations(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_table_groups_restaurant ON table_groups(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_schedules_restaurant ON schedules(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day_of_week)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_shift_templates_restaurant ON shift_templates(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_day_exceptions_restaurant ON day_exceptions(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_day_exceptions_date ON day_exceptions(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_no_shows_client ON client_no_shows(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_no_shows_restaurant ON client_no_shows(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_status ON whatsapp_notifications(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled ON whatsapp_notifications(scheduled_for)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id)`);

    console.log('✅ Todas las tablas creadas exitosamente');
    console.log('✅ Todos los índices creados exitosamente');
    
    console.log('\n📊 Insertando datos iniciales de ejemplo...');
    
    console.log('  → Insertando provincias de Galicia...');
    await client.query(`
      INSERT INTO provinces (id, name, created_at) VALUES
      ('prov-pontevedra', 'Pontevedra', NOW()),
      ('prov-acoruña', 'A Coruña', NOW()),
      ('prov-lugo', 'Lugo', NOW()),
      ('prov-ourense', 'Ourense', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('  → Insertando ciudades principales...');
    await client.query(`
      INSERT INTO cities (id, name, province_id, created_at) VALUES
      ('city-vigo', 'Vigo', 'prov-pontevedra', NOW()),
      ('city-pontevedra', 'Pontevedra', 'prov-pontevedra', NOW()),
      ('city-meaño', 'Meaño', 'prov-pontevedra', NOW()),
      ('city-acoruña', 'A Coruña', 'prov-acoruña', NOW()),
      ('city-santiago', 'Santiago de Compostela', 'prov-acoruña', NOW()),
      ('city-lugo', 'Lugo', 'prov-lugo', NOW()),
      ('city-ourense', 'Ourense', 'prov-ourense', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('  → Insertando planes de suscripción...');
    await client.query(`
      INSERT INTO subscription_plans (id, name, price, enabled_modules, is_active, created_at) VALUES
      ('plan-basico', 'Plan Básico', 29.99, '["mesas","horarios","reservas"]', true, NOW()),
      ('plan-pro', 'Plan Profesional', 49.99, '["mesas","horarios","reservas","valoraciones","enlaces"]', true, NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('  → Insertando duraciones de suscripción...');
    await client.query(`
      INSERT INTO subscription_durations (id, name, months, description, is_active, created_at) VALUES
      ('dur-0meses', 'Prueba', 0, 'Sin duración', true, NOW()),
      ('dur-1mes', '1 Mes', 1, 'Prueba mensual', true, NOW()),
      ('dur-3meses', '3 Meses', 3, 'Trimestral', true, NOW()),
      ('dur-6meses', '6 Meses', 6, 'Semestral', true, NOW()),
      ('dur-12meses', '12 Meses', 12, 'Anual (2 meses gratis)', true, NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('  → Insertando módulos del sistema...');
    await client.query(`
      INSERT INTO modules (id, name, display_name, description, is_active) VALUES
      ('mod-mesas', 'mesas', 'Gestión de Mesas', 'Gestión de mesas y ubicaciones', true),
      ('mod-horarios', 'horarios', 'Horarios y Turnos', 'Configuración de horarios de servicio', true),
      ('mod-reservas', 'reservas', 'Reservas', 'Sistema de reservas online', true),
      ('mod-valoraciones', 'valoraciones', 'Valoraciones', 'Sistema de valoración de clientes', true),
      ('mod-enlaces', 'enlaces', 'Enlaces Personalizados', 'Enlaces personalizados en reservas', true)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('  → Insertando comerciales por defecto...');
    await client.query(`
      INSERT INTO sales_representatives (id, first_name, last_name, dni, address, phone, email,
        new_client_commission_percent, first_renewal_commission_percent, renewal_commission_percent, is_active)
      VALUES 
        ('salesrep-website', 'Página', 'Web', '00000000A', 'Online', '+34000000000', 'web@quieromesa.com', 0, 0, 0, true),
        ('salesrep-marcos', 'Marcos', 'Antonio', '00000001A', 'Galicia', '+34666088708', 'marcos@quieromesa.com', 10, 5, 3, true)
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('  → Insertando admin por defecto...');
    await client.query(`
      INSERT INTO admin_users (id, username, password, email, created_at, updated_at)
      VALUES ('admin-1', 'admin', 'admin123', 'admin@quieromesa.com', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Datos iniciales insertados');
    console.log('🎉 Esquema completo inicializado correctamente');
    console.log('\n📌 BASE DE DATOS LISTA PARA USAR');
    console.log('\n📊 Resumen de datos iniciales:');
    console.log('   • 4 provincias de Galicia');
    console.log('   • 7 ciudades principales');
    console.log('   • 2 planes de suscripción');
    console.log('   • 5 duraciones de suscripción');
    console.log('   • 5 módulos del sistema');
    console.log('\n✅ El sistema está listo para crear restaurantes desde el panel admin');

  } catch (error) {
    console.error('❌ Error durante la inicialización del esquema:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initCompleteSchema();
