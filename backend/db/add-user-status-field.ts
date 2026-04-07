import { Pool } from 'pg';

console.log('🔄 Añadiendo campo user_status a clients...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addUserStatusField() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida');

    console.log('🔍 Verificando si la columna user_status existe...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND column_name = 'user_status'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('➕ Agregando columna user_status...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN user_status TEXT NOT NULL DEFAULT 'user_new'
      `);
      console.log('✅ Columna user_status agregada');

      console.log('🔄 Actualizando usuarios existentes con reservas confirmadas a user_conf...');
      await client.query(`
        UPDATE clients 
        SET user_status = 'user_conf'
        WHERE id IN (
          SELECT DISTINCT client_id 
          FROM reservations 
          WHERE status = 'confirmed' OR status = 'completed'
        )
      `);
      console.log('✅ Usuarios existentes actualizados');
    } else {
      console.log('✓ La columna user_status ya existe');
    }

    console.log('🔍 Creando índice para user_status...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_user_status ON clients(user_status)
    `);
    console.log('✅ Índice creado');

    console.log('✅ Campo user_status agregado exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addUserStatusField();
