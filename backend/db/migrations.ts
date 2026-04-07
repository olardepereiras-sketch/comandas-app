import { createClient } from '@libsql/client';

console.log('🔄 Iniciando migraciones de base de datos...');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ Error: Faltan variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
  console.log('   Verifica que el archivo .env esté configurado correctamente');
  process.exit(1);
}

console.log(`🔗 Conectando a: ${url.substring(0, 40)}...`);

const db = createClient({
  url,
  authToken,
});

async function runMigrations() {
  try {
    console.log('✅ Conexión establecida con Turso');

    console.log('📋 Creando tabla provinces...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS provinces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla cities...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        province_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla subscription_plans...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_price REAL NOT NULL,
        enabled_modules TEXT NOT NULL,
        duration_months INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla restaurants...');
    await db.execute(`
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
        is_active INTEGER NOT NULL DEFAULT 1,
        subscription_plan_id TEXT,
        subscription_expiry INTEGER NOT NULL,
        enabled_modules TEXT NOT NULL,
        advance_booking_days INTEGER NOT NULL DEFAULT 30,
        custom_links TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (city_id) REFERENCES cities(id),
        FOREIGN KEY (province_id) REFERENCES provinces(id),
        FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id)
      )
    `);

    console.log('📋 Creando tabla clients...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        rating REAL NOT NULL DEFAULT 4.0,
        total_ratings INTEGER NOT NULL DEFAULT 0,
        rating_details TEXT,
        no_show_count INTEGER NOT NULL DEFAULT 0,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        blocked_until INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla table_locations...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS table_locations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla tables...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        location_id TEXT NOT NULL,
        restaurant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        min_capacity INTEGER NOT NULL,
        max_capacity INTEGER NOT NULL,
        allows_high_chairs INTEGER NOT NULL DEFAULT 1,
        allows_strollers INTEGER NOT NULL DEFAULT 1,
        allows_pets INTEGER NOT NULL DEFAULT 1,
        order_num INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (location_id) REFERENCES table_locations(id) ON DELETE CASCADE,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla reservations...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        date INTEGER NOT NULL,
        time TEXT NOT NULL,
        guests INTEGER NOT NULL,
        location_id TEXT NOT NULL,
        table_ids TEXT NOT NULL,
        needs_high_chair INTEGER NOT NULL DEFAULT 0,
        needs_stroller INTEGER NOT NULL DEFAULT 0,
        has_pets INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        notes TEXT,
        confirmation_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES table_locations(id)
      )
    `);

    console.log('📋 Creando tabla rating_criteria...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rating_criteria (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        order_num INTEGER NOT NULL,
        default_value INTEGER NOT NULL DEFAULT 4,
        is_special_criteria INTEGER NOT NULL DEFAULT 0,
        special_criteria_config TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla client_ratings...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_ratings (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        reservation_id TEXT NOT NULL,
        ratings TEXT NOT NULL,
        private_comment TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
      )
    `);

    console.log('📋 Creando tabla admin_users...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        last_ip TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla auth_sessions...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('📋 Creando tabla verification_codes...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_type TEXT NOT NULL,
        code TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);

    console.log('✅ Todas las tablas creadas exitosamente');
    console.log('🎉 Migraciones completadas');

  } catch (error) {
    console.error('❌ Error durante las migraciones:', error);
    process.exit(1);
  }
}

runMigrations();
