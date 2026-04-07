import { Pool } from 'pg';

console.log('🧹 LIMPIEZA COMPLETA Y RE-INICIALIZACIÓN DE BASE DE DATOS');
console.log('=========================================================\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function cleanAndInit() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('\n🧹 PASO 1: Eliminando TODAS las tablas...');
    await client.query('DROP TABLE IF EXISTS verification_codes CASCADE');
    await client.query('DROP TABLE IF EXISTS auth_sessions CASCADE');
    await client.query('DROP TABLE IF EXISTS client_ratings CASCADE');
    await client.query('DROP TABLE IF EXISTS rating_criteria CASCADE');
    await client.query('DROP TABLE IF EXISTS reservations CASCADE');
    await client.query('DROP TABLE IF EXISTS tables CASCADE');
    await client.query('DROP TABLE IF EXISTS table_locations CASCADE');
    await client.query('DROP TABLE IF EXISTS schedules CASCADE');
    await client.query('DROP TABLE IF EXISTS clients CASCADE');
    await client.query('DROP TABLE IF EXISTS restaurants CASCADE');
    await client.query('DROP TABLE IF EXISTS subscription_durations CASCADE');
    await client.query('DROP TABLE IF EXISTS subscription_plans CASCADE');
    await client.query('DROP TABLE IF EXISTS cities CASCADE');
    await client.query('DROP TABLE IF EXISTS provinces CASCADE');
    await client.query('DROP TABLE IF EXISTS admin_users CASCADE');
    console.log('✅ Tablas eliminadas');

    console.log('\n📋 PASO 2: Eliminando reglas PostgreSQL que puedan causar conflictos...');
    try {
      await client.query('DROP RULE IF EXISTS prevent_duplicate_restaurant ON tables');
      await client.query('DROP RULE IF EXISTS validate_restaurant_id ON tables');
      await client.query('DROP RULE IF EXISTS check_restaurant_exists ON tables');
      console.log('✅ Reglas eliminadas (si existían)');
    } catch {
      console.log('⚠️  No había reglas para eliminar');
    }

    console.log('\n📋 PASO 3: Creando tablas desde cero...');
    
    await client.query(`
      CREATE TABLE provinces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        province_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
      )
    `);

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

    await client.query(`
      CREATE TABLE restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        username TEXT UNIQUE,
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
        subscription_expiry TIMESTAMP,
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

    await client.query(`
      CREATE TABLE schedules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        day_of_week INTEGER NOT NULL,
        shift_name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        max_capacity INTEGER NOT NULL,
        min_client_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

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

    console.log('✅ Tablas creadas');

    console.log('\n📋 PASO 4: Creando índices...');
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
    await client.query(`CREATE INDEX idx_verification_codes_user ON verification_codes(user_id)`);
    console.log('✅ Índices creados');
    
    console.log('\n📋 PASO 5: Insertando datos MÍNIMOS necesarios...');
    
    console.log('  → Provincias de Galicia...');
    await client.query(`
      INSERT INTO provinces (id, name, created_at) VALUES
      ('prov-pontevedra', 'Pontevedra', NOW()),
      ('prov-acoruña', 'A Coruña', NOW()),
      ('prov-lugo', 'Lugo', NOW()),
      ('prov-ourense', 'Ourense', NOW())
    `);
    
    console.log('  → Ciudades principales...');
    await client.query(`
      INSERT INTO cities (id, name, province_id, created_at) VALUES
      ('city-vigo', 'Vigo', 'prov-pontevedra', NOW()),
      ('city-pontevedra', 'Pontevedra', 'prov-pontevedra', NOW()),
      ('city-meaño', 'Meaño', 'prov-pontevedra', NOW()),
      ('city-acoruña', 'A Coruña', 'prov-acoruña', NOW()),
      ('city-santiago', 'Santiago de Compostela', 'prov-acoruña', NOW()),
      ('city-lugo', 'Lugo', 'prov-lugo', NOW()),
      ('city-ourense', 'Ourense', 'prov-ourense', NOW())
    `);

    console.log('  → Plan de suscripción básico...');
    await client.query(`
      INSERT INTO subscription_plans (id, name, price, enabled_modules, is_active, created_at) VALUES
      ('plan-basico', 'Plan Básico', 29.99, '["mesas","horarios","reservas"]', true, NOW()),
      ('plan-pro', 'Plan Profesional', 49.99, '["mesas","horarios","reservas","valoraciones","enlaces"]', true, NOW())
    `);

    console.log('  → Duraciones de suscripción...');
    await client.query(`
      INSERT INTO subscription_durations (id, name, months, description, is_active, created_at) VALUES
      ('dur-1mes', '1 Mes', 1, 'Prueba mensual', true, NOW()),
      ('dur-3meses', '3 Meses', 3, 'Trimestral', true, NOW()),
      ('dur-6meses', '6 Meses', 6, 'Semestral', true, NOW()),
      ('dur-12meses', '12 Meses', 12, 'Anual (2 meses gratis)', true, NOW())
    `);

    console.log('\n✅ BASE DE DATOS LIMPIA Y LISTA PARA USAR');
    console.log('\n📌 PRÓXIMOS PASOS:');
    console.log('   1. Acceder a http://200.234.236.133/admin');
    console.log('   2. Ir a "Restaurantes" y crear tu primer restaurante');
    console.log('   3. El sistema generará automáticamente el slug y credenciales');
    console.log('   4. Usar el slug para acceder: http://200.234.236.133/restaurant/login/[slug]');
    console.log('\n🎉 ¡Sistema listo para producción!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAndInit();
