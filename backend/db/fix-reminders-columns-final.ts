import { Pool } from 'pg';

console.log('🔄 Corrigiendo columnas de recordatorios...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixRemindersColumns() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    
    console.log('🔍 Verificando columnas actuales...');
    const currentColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name LIKE '%reminder%'
      ORDER BY column_name;
    `);
    
    console.log('📋 Columnas actuales de recordatorios:', currentColumns.rows.map(r => r.column_name));

    console.log('🔧 Agregando nuevas columnas estandarizadas...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_2h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_30m_enabled BOOLEAN DEFAULT false;
    `);

    console.log('🔄 Migrando datos de columnas antiguas a nuevas...');
    
    await client.query(`
      UPDATE restaurants 
      SET 
        enable_reminders = COALESCE(reminder1_enabled, false) OR COALESCE(reminder2_enabled, false),
        reminder_24h_enabled = false,
        reminder_2h_enabled = COALESCE(reminder1_enabled, false) AND COALESCE(reminder1_hours, 0) = 2,
        reminder_30m_enabled = COALESCE(reminder2_enabled, false) AND COALESCE(reminder2_minutes, 0) BETWEEN 25 AND 35
      WHERE reminder1_enabled IS NOT NULL OR reminder2_enabled IS NOT NULL;
    `);

    console.log('📊 Verificando migración de datos...');
    const migratedData = await client.query(`
      SELECT 
        name,
        enable_reminders,
        reminder_24h_enabled,
        reminder_2h_enabled,
        reminder_30m_enabled,
        reminder1_enabled,
        reminder1_hours,
        reminder2_enabled,
        reminder2_minutes
      FROM restaurants
      WHERE enable_reminders = true;
    `);

    if (migratedData.rows.length > 0) {
      console.log('\n✅ Restaurantes con recordatorios migrados:');
      migratedData.rows.forEach((row: any) => {
        console.log(`\n  🏪 ${row.name}`);
        console.log(`     Antiguo: reminder1=${row.reminder1_enabled} (${row.reminder1_hours}h), reminder2=${row.reminder2_enabled} (${row.reminder2_minutes}m)`);
        console.log(`     Nuevo: 24h=${row.reminder_24h_enabled}, 2h=${row.reminder_2h_enabled}, 30m=${row.reminder_30m_enabled}`);
      });
    } else {
      console.log('\n⚠️  No hay restaurantes con recordatorios habilitados');
    }

    const newColumns = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('enable_reminders', 'reminder_24h_enabled', 'reminder_2h_enabled', 'reminder_30m_enabled')
      ORDER BY column_name;
    `);

    console.log('\n📋 Nuevas columnas creadas:');
    newColumns.rows.forEach((row: any) => {
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

fixRemindersColumns().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
