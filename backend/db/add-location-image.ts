import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

async function addLocationImageField() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    console.log('📝 Añadiendo campo image_url a table_locations...');
    
    await client.query(`
      ALTER TABLE table_locations 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    console.log('✅ Campo image_url añadido exitosamente a table_locations');

    await client.end();
    console.log('✅ Migración completada');
  } catch (error: any) {
    console.error('❌ Error en la migración:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addLocationImageField();
