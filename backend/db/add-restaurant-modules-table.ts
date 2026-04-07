import { Pool } from 'pg';

console.log('🔧 Añadiendo tabla restaurant_modules...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addRestaurantModulesTable() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando si tabla restaurant_modules existe...');
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'restaurant_modules'
      )
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  Tabla restaurant_modules ya existe, recreándola...');
      await client.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
    }

    console.log('📋 Creando tabla restaurant_modules...');
    await client.query(`
      CREATE TABLE restaurant_modules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        UNIQUE (restaurant_id, module_id)
      )
    `);

    console.log('📋 Poblando restaurant_modules con módulos de planes existentes...');
    
    const restaurantsResult = await client.query(`
      SELECT r.id as restaurant_id, sp.enabled_modules
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
      WHERE sp.enabled_modules IS NOT NULL
    `);

    let insertedCount = 0;
    for (const row of restaurantsResult.rows) {
      let enabledModules: string[] = [];
      try {
        enabledModules = typeof row.enabled_modules === 'string' 
          ? JSON.parse(row.enabled_modules) 
          : row.enabled_modules;
      } catch {
        console.warn(`⚠️  No se pudo parsear enabled_modules para restaurante ${row.restaurant_id}`);
        continue;
      }

      for (const moduleId of enabledModules) {
        const id = `rm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `INSERT INTO restaurant_modules (id, restaurant_id, module_id, is_enabled)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (restaurant_id, module_id) DO NOTHING`,
          [id, row.restaurant_id, moduleId]
        );
        insertedCount++;
      }
    }

    console.log(`✅ ${insertedCount} módulos de restaurante insertados`);

    console.log('✅ Tabla restaurant_modules creada correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addRestaurantModulesTable()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
