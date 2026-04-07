import { Pool } from 'pg';

console.log('🔄 Corrigiendo columnas de recordatorios en la tabla restaurants...');

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

async function fixRemindersColumns() {
  const client = await pool.connect();

  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('🔧 Verificando columnas existentes...');

    const existingColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name LIKE '%reminder%'
    `);

    console.log('📋 Columnas actuales de recordatorios:');
    existingColumns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}`);
    });

    console.log('\n🔧 Agregando columnas correctas de recordatorios...');

    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS enable_reminders BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_2h_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_30m_enabled BOOLEAN DEFAULT false;
    `);

    console.log('✅ Columnas agregadas exitosamente');

    console.log('\n🔄 Migrando datos de columnas antiguas si existen...');
    
    const hasOldColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('reminder1_enabled', 'reminder2_enabled')
    `);

    if (hasOldColumns.rows.length > 0) {
      console.log('📋 Encontradas columnas antiguas, migrando datos...');
      
      await client.query(`
        UPDATE restaurants 
        SET 
          enable_reminders = CASE WHEN reminder1_enabled OR reminder2_enabled THEN true ELSE false END,
          reminder_2h_enabled = COALESCE(reminder1_enabled, false),
          reminder_30m_enabled = COALESCE(reminder2_enabled, false)
        WHERE reminder1_enabled IS NOT NULL OR reminder2_enabled IS NOT NULL
      `);

      console.log('✅ Datos migrados exitosamente');
    }

    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('enable_reminders', 'reminder_24h_enabled', 'reminder_2h_enabled', 'reminder_30m_enabled')
      ORDER BY column_name;
    `);

    console.log('\n📋 Columnas finales verificadas:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

    const restaurantsWithReminders = await client.query(`
      SELECT id, name, enable_reminders, reminder_24h_enabled, reminder_2h_enabled, reminder_30m_enabled
      FROM restaurants
      WHERE enable_reminders = true
    `);

    console.log('\n📊 Restaurantes con recordatorios activos:');
    if (restaurantsWithReminders.rows.length === 0) {
      console.log('  ℹ️  No hay restaurantes con recordatorios activados');
    } else {
      restaurantsWithReminders.rows.forEach((rest: any) => {
        console.log(`  - ${rest.name}:`);
        console.log(`    24h: ${rest.reminder_24h_enabled ? '✅' : '❌'}`);
        console.log(`    2h: ${rest.reminder_2h_enabled ? '✅' : '❌'}`);
        console.log(`    30m: ${rest.reminder_30m_enabled ? '✅' : '❌'}`);
      });
    }

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
