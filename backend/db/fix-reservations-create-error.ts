import { Pool } from 'pg';

console.log('🔧 Arreglando error en creación de reservas...');

const connectionString = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa_db';

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

console.log('✅ Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixReservationsSchema() {
  try {
    const client = await pool.connect();
    
    console.log('📋 Verificando esquema de tabla reservations...');
    
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Columnas actuales en reservations:', columnsResult.rows.map(r => r.column_name).join(', '));
    
    console.log('📋 Añadiendo columnas faltantes a reservations...');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS confirmation_token TEXT;
    `);
    console.log('✅ Columna confirmation_token verificada');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS confirmation_token2 TEXT;
    `);
    console.log('✅ Columna confirmation_token2 verificada');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS token TEXT;
    `);
    console.log('✅ Columna token verificada');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_notes TEXT DEFAULT '';
    `);
    console.log('✅ Columna client_notes verificada');
    
    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT '';
    `);
    console.log('✅ Columna location_name verificada');

    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '';
    `);
    console.log('✅ Columna client_phone verificada');

    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_name TEXT DEFAULT '';
    `);
    console.log('✅ Columna client_name verificada');

    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '';
    `);
    console.log('✅ Columna client_email verificada');

    await client.query(`
      ALTER TABLE reservations 
      ADD COLUMN IF NOT EXISTS high_chair_count INTEGER DEFAULT 0;
    `);
    console.log('✅ Columna high_chair_count verificada');
    
    console.log('📋 Verificando columnas después de cambios...');
    const finalColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Columnas finales:', finalColumnsResult.rows.map(r => r.column_name).join(', '));

    client.release();
    await pool.end();
    console.log('🎉 Esquema de reservations corregido exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixReservationsSchema();
