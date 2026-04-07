import { Pool } from 'pg';

console.log('🔧 ARREGLANDO ESQUEMA DE CLIENTES');
console.log('=====================================\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function fixClientsSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📋 Agregando columnas de valoración detallada...');
    await client.query(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS rating_punctuality DECIMAL(3,1) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_behavior DECIMAL(3,1) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_kindness DECIMAL(3,1) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_education DECIMAL(3,1) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_tip DECIMAL(3,1) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS total_no_shows INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    console.log('✅ Columnas de valoración agregadas\n');

    console.log('📋 Verificando estructura final...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas en tabla clients:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

    console.log('\n✅ Esquema de clientes actualizado correctamente');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixClientsSchema();
