import { Pool } from 'pg';

console.log('🔄 Arreglando esquema de client_ratings...');

const connectionString = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL o EXPO_PUBLIC_RORK_DB_ENDPOINT');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

async function fixClientRatingsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida');

    console.log('🔍 Verificando columnas existentes en client_ratings...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'client_ratings'
      ORDER BY ordinal_position
    `);

    console.log('📋 Columnas actuales:', result.rows.map(r => r.column_name).join(', '));

    const existingColumns = result.rows.map(r => r.column_name);

    if (!existingColumns.includes('rating_average')) {
      console.log('➕ Agregando columna rating_average...');
      await client.query(`
        ALTER TABLE client_ratings 
        ADD COLUMN rating_average DECIMAL(3,2) DEFAULT 4.0
      `);
      console.log('✅ Columna rating_average agregada');
    } else {
      console.log('✓ Columna rating_average ya existe');
    }

    if (!existingColumns.includes('was_no_show')) {
      console.log('➕ Agregando columna was_no_show...');
      await client.query(`
        ALTER TABLE client_ratings 
        ADD COLUMN was_no_show BOOLEAN DEFAULT false
      `);
      console.log('✅ Columna was_no_show agregada');
    } else {
      console.log('✓ Columna was_no_show ya existe');
    }

    if (!existingColumns.includes('auto_rated')) {
      console.log('➕ Agregando columna auto_rated...');
      await client.query(`
        ALTER TABLE client_ratings 
        ADD COLUMN auto_rated BOOLEAN DEFAULT false
      `);
      console.log('✅ Columna auto_rated agregada');
    } else {
      console.log('✓ Columna auto_rated ya existe');
    }

    console.log('🔍 Verificando columnas en reservations...');
    const resResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);

    const resColumns = resResult.rows.map(r => r.column_name);

    if (!resColumns.includes('rating_deadline')) {
      console.log('➕ Agregando columna rating_deadline a reservations...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN rating_deadline TIMESTAMP
      `);
      console.log('✅ Columna rating_deadline agregada');
    } else {
      console.log('✓ Columna rating_deadline ya existe');
    }

    if (!resColumns.includes('client_ratings')) {
      console.log('➕ Agregando columna client_ratings a reservations...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN client_ratings TEXT
      `);
      console.log('✅ Columna client_ratings agregada');
    } else {
      console.log('✓ Columna client_ratings ya existe');
    }

    if (!resColumns.includes('was_no_show')) {
      console.log('➕ Agregando columna was_no_show a reservations...');
      await client.query(`
        ALTER TABLE reservations 
        ADD COLUMN was_no_show BOOLEAN DEFAULT false
      `);
      console.log('✅ Columna was_no_show agregada');
    } else {
      console.log('✓ Columna was_no_show ya existe');
    }

    console.log('🔍 Verificando columnas en clients...');
    const clientResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);

    const clientColumns = clientResult.rows.map(r => r.column_name);

    if (!clientColumns.includes('local_ratings')) {
      console.log('➕ Agregando columna local_ratings a clients...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN local_ratings TEXT DEFAULT '{}'
      `);
      console.log('✅ Columna local_ratings agregada');
    } else {
      console.log('✓ Columna local_ratings ya existe');
    }

    console.log('✅ Esquema de client_ratings corregido exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixClientRatingsSchema().catch(console.error);
