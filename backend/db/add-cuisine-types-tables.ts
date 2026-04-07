import { Pool } from 'pg';

console.log('🔧 AGREGANDO TABLAS DE TIPOS DE COCINA');
console.log('========================================\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function addCuisineTypesTables() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📋 Creando tabla cuisine_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cuisine_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla cuisine_types creada\n');

    console.log('📋 Creando tabla province_cuisine_types...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS province_cuisine_types (
        id TEXT PRIMARY KEY,
        province_id TEXT NOT NULL,
        cuisine_type_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
        FOREIGN KEY (cuisine_type_id) REFERENCES cuisine_types(id) ON DELETE CASCADE,
        UNIQUE(province_id, cuisine_type_id)
      )
    `);
    console.log('✅ Tabla province_cuisine_types creada\n');

    console.log('📋 Insertando tipos de cocina iniciales...');
    const cuisineTypes = [
      'Gallega', 'Asador', 'Sin Gluten', 'Vegana', 'Vegetariana',
      'Marisquería', 'Italiana', 'Japonesa', 'China', 'Mexicana',
      'India', 'Mediterránea', 'Fusión', 'Fast Food', 'Tradicional'
    ];

    for (const name of cuisineTypes) {
      await client.query(`
        INSERT INTO cuisine_types (id, name, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [`cuisine-${name.toLowerCase().replace(/\s+/g, '-')}`, name, new Date()]);
    }
    console.log(`✅ ${cuisineTypes.length} tipos de cocina insertados\n`);

    console.log('✅ Tablas de tipos de cocina creadas correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCuisineTypesTables();
