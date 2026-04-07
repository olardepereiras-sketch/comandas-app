import { Pool } from 'pg';

console.log('🔄 Iniciando creación completa del esquema de PostgreSQL...');

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

    console.log('🧹 Eliminando tablas existentes (si existen)...');
    await client.query('DROP TABLE IF EXISTS verification_codes CASCADE');
    await client.query('DROP TABLE IF EXISTS auth_sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS client_ratings CASCADE');
    await client.query('DROP TABLE IF EXISTS rating_criteria CASCADE');
    await client.query('DROP TABLE IF EXISTS reservations CASCADE');
    await client.query('DROP TABLE IF EXISTS tables CASCADE');
    await client.query('DROP TABLE IF EXISTS table_locations CASCADE');
    await client.query('DROP TABLE IF EXISTS clients CASCADE');
    await client.query('DROP TABLE IF EXISTS restaurants CASCADE');
    await client.query('DROP TABLE IF EXISTS subscription_durations CASCADE');
    await client.query('DROP TABLE IF EXISTS subscription_plans CASCADE');
    await client.query('DROP TABLE IF EXISTS cities CASCADE');
    await client.query('DROP TABLE IF EXISTS provinces CASCADE');
    await client.query('DROP TABLE IF EXISTS admin_users CASCADE');

    console.log('📋 Creando tabla provinces...');
    await client.query(`
      CREATE TABLE provinces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla cities...');
    await client.query(`
      CREATE TABLE cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        province_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla subscription_plans...');
    await client.query(`
      CREATE TABLE subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        enabled_modules TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla subscription_durations...');
    await client.query(`
      CREATE TABLE subscription_durations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        months INTEGER NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla restaurants...');
    await client.query(`
      CREATE TABLE restaurants (
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
      CREATE TABLE clients (
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla table_locations...');
    await client.query(`
      CREATE TABLE table_locations (
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
      CREATE TABLE tables (
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
        order_num INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla schedules...');
    await client.query(`
      CREATE TABLE schedules (
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

    console.log('📋 Creando tabla reservations...');
    await client.query(`
      CREATE TABLE reservations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location_id TEXT NOT NULL,
        table_ids TEXT NOT NULL,
        needs_high_chair BOOLEAN NOT NULL DEFAULT false,
        needs_stroller BOOLEAN NOT NULL DEFAULT false,
        has_pets BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL,
        notes TEXT,
        confirmation_token TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES table_locations(id)
      )
    `);

    console.log('📋 Creando tabla rating_criteria...');
    await client.query(`
      CREATE TABLE rating_criteria (
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
      CREATE TABLE client_ratings (
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

    console.log('📋 Creando tabla admin_users...');
    await client.query(`
      CREATE TABLE admin_users (
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
      CREATE TABLE auth_sessions (
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
      CREATE TABLE verification_codes (
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
    await client.query(`CREATE INDEX idx_cities_province ON cities(province_id)`);
    await client.query(`CREATE INDEX idx_restaurants_city ON restaurants(city_id)`);
    await client.query(`CREATE INDEX idx_restaurants_province ON restaurants(province_id)`);
    await client.query(`CREATE INDEX idx_restaurants_slug ON restaurants(slug)`);
    await client.query(`CREATE INDEX idx_restaurants_active ON restaurants(is_active)`);
    await client.query(`CREATE INDEX idx_reservations_restaurant ON reservations(restaurant_id)`);
    await client.query(`CREATE INDEX idx_reservations_date ON reservations(date)`);
    await client.query(`CREATE INDEX idx_reservations_status ON reservations(status)`);
    await client.query(`CREATE INDEX idx_tables_location ON tables(location_id)`);
    await client.query(`CREATE INDEX idx_tables_restaurant ON tables(restaurant_id)`);
    await client.query(`CREATE INDEX idx_table_locations_restaurant ON table_locations(restaurant_id)`);
    await client.query(`CREATE INDEX idx_schedules_restaurant ON schedules(restaurant_id)`);
    await client.query(`CREATE INDEX idx_schedules_day ON schedules(day_of_week)`);
    await client.query(`CREATE INDEX idx_clients_phone ON clients(phone)`);
    await client.query(`CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id)`);
    await client.query(`CREATE INDEX idx_verification_codes_user ON verification_codes(user_id)`)

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
      ('dur-1mes', '1 Mes', 1, 'Prueba mensual', true, NOW()),
      ('dur-3meses', '3 Meses', 3, 'Trimestral', true, NOW()),
      ('dur-6meses', '6 Meses', 6, 'Semestral', true, NOW()),
      ('dur-12meses', '12 Meses', 12, 'Anual (2 meses gratis)', true, NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('✅ Datos iniciales insertados');
    console.log('🎉 Esquema completo inicializado correctamente');
    console.log('\n📌 BASE DE DATOS LISTA PARA USAR');
    console.log('\n📊 Resumen de datos iniciales:');
    console.log('   • 4 provincias de Galicia');
    console.log('   • 7 ciudades principales');
    console.log('   • 2 planes de suscripción');
    console.log('   • 4 duraciones de suscripción');
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
