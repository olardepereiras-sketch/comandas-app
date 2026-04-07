import { Pool } from 'pg';

console.log('🔧 Agregando columnas faltantes a la tabla restaurants...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    const columnsToAdd = [
      { name: 'table_rotation_time', type: 'INTEGER', default: '100' },
      { name: 'auto_send_whatsapp', type: 'BOOLEAN', default: 'false' },
      { name: 'min_booking_advance_minutes', type: 'INTEGER', default: '0' },
      { name: 'use_whatsapp_web', type: 'BOOLEAN', default: 'false' },
      { name: 'enable_email_notifications', type: 'BOOLEAN', default: 'false' },
      { name: 'min_modify_cancel_minutes', type: 'INTEGER', default: '180' },
      { name: 'reminder1_enabled', type: 'BOOLEAN', default: 'false' },
      { name: 'reminder1_hours', type: 'INTEGER', default: '24' },
      { name: 'reminder2_enabled', type: 'BOOLEAN', default: 'false' },
      { name: 'reminder2_minutes', type: 'INTEGER', default: '60' },
    ];

    for (const column of columnsToAdd) {
      try {
        console.log(`📋 Agregando columna ${column.name}...`);
        await client.query(`
          ALTER TABLE restaurants 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.default}
        `);
        console.log(`✅ Columna ${column.name} agregada`);
      } catch (error: any) {
        if (error.code === '42701') {
          console.log(`ℹ️ Columna ${column.name} ya existe`);
        } else {
          console.error(`❌ Error al agregar columna ${column.name}:`, error.message);
        }
      }
    }

    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Columnas actuales en la tabla restaurants:');
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Proceso completado exitosamente');

  } catch (error: any) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns();
