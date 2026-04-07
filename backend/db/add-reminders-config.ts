import { Pool } from 'pg';

console.log('🔄 Agregando campos de recordatorios y tiempo de modificación...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  console.log('   Formato: postgresql://usuario:contraseña@localhost:5432/nombre_bd');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addRemindersAndModifyConfig() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('🔧 Agregando nuevos campos a la tabla restaurants...');

    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS min_modify_cancel_minutes INTEGER DEFAULT 180,
      ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24,
      ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60;
    `);

    console.log('✅ Campos agregados exitosamente');

    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('min_modify_cancel_minutes', 'reminder1_enabled', 'reminder1_hours', 'reminder2_enabled', 'reminder2_minutes')
      ORDER BY column_name;
    `);

    console.log('\n📋 Campos verificados:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

    console.log('\n✅ Migración completada exitosamente');
  } catch (error: any) {
    console.error('❌ Error en la migración:', error);
    console.error('Detalle:', error.detail || error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

addRemindersAndModifyConfig().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
