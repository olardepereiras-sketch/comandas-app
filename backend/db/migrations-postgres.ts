import { Pool } from 'pg';

console.log('🔄 Iniciando migraciones de PostgreSQL...');

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

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

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
        monthly_price DECIMAL(10,2) NOT NULL,
        enabled_modules TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla subscription_durations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_durations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        months INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
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
        enabled_modules TEXT NOT NULL,
        advance_booking_days INTEGER NOT NULL DEFAULT 30,
        custom_links TEXT,
        notification_phones TEXT,
        notification_email TEXT,
        whatsapp_custom_message TEXT,
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
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log('📋 Creando tabla table_locations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_locations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        allows_high_chairs BOOLEAN NOT NULL DEFAULT true,
        allows_strollers BOOLEAN NOT NULL DEFAULT true,
        allows_pets BOOLEAN NOT NULL DEFAULT true,
        order_num INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
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

    console.log('📋 Agregando columnas important_message a restaurants si no existen...');
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message_enabled BOOLEAN DEFAULT false`);
    await client.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS important_message TEXT DEFAULT ''`);

    console.log('📋 Creando índices para mejorar rendimiento...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cities_province ON cities(province_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_province ON restaurants(province_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tables_location ON tables(location_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON tables(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_schedules_restaurant ON schedules(restaurant_id)`);

    console.log('✅ Todas las tablas creadas exitosamente');
    console.log('✅ Todos los índices creados exitosamente');
    console.log('🎉 Migraciones completadas');

  } catch (error) {
    console.error('❌ Error durante las migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
