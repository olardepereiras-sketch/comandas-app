import { Pool } from 'pg';

console.log('🧹 Limpiando base de datos PostgreSQL...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function cleanDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('🔄 Deshabilitando restricciones de claves foráneas temporalmente...');
    await client.query('SET session_replication_role = replica;');

    const tables = [
      'verification_codes',
      'auth_sessions',
      'client_ratings',
      'rating_criteria',
      'reservations',
      'tables',
      'table_locations',
      'clients',
      'restaurants',
      'subscription_durations',
      'subscription_plans',
      'cities',
      'provinces',
      'admin_users'
    ];

    for (const table of tables) {
      try {
        console.log(`  🗑️  Limpiando tabla: ${table}...`);
        await client.query(`TRUNCATE TABLE ${table} CASCADE`);
        console.log(`  ✅ Tabla ${table} limpiada`);
      } catch (error: any) {
        console.log(`  ⚠️  Tabla ${table} no existe o ya está vacía`);
      }
    }

    console.log('🔄 Rehabilitando restricciones de claves foráneas...');
    await client.query('SET session_replication_role = DEFAULT;');

    console.log('\n✅ Base de datos limpiada exitosamente');
    console.log('💡 Ahora puedes ejecutar: bun backend/db/seed-postgres.ts');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
