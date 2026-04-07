import { Pool } from 'pg';

console.log('🔄 Agregando columnas correctas para recordatorios...');

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

async function fixReminderColumns() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('🔧 Agregando columnas de recordatorios a la tabla restaurants...');

    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_2h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_30m_enabled BOOLEAN DEFAULT false;
    `);

    console.log('✅ Columnas agregadas exitosamente');

    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('enable_reminders', 'reminder_24h_enabled', 'reminder_2h_enabled', 'reminder_30m_enabled')
      ORDER BY column_name;
    `);

    console.log('\n📋 Columnas verificadas:');
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

fixReminderColumns().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
