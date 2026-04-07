import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWhatsAppNotificationsTable() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    console.log('📋 Verificando estructura de whatsapp_notifications...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas actuales:', columnsResult.rows);

    const hasUpdatedAt = columnsResult.rows.some((row: any) => row.column_name === 'updated_at');
    
    if (hasUpdatedAt) {
      console.log('🔧 Eliminando columna updated_at...');
      await client.query(`
        ALTER TABLE whatsapp_notifications 
        DROP COLUMN IF EXISTS updated_at
      `);
      console.log('✅ Columna updated_at eliminada');
    } else {
      console.log('✅ Columna updated_at ya no existe');
    }

    console.log('📋 Verificando estructura actualizada...');
    const updatedColumnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas finales:', updatedColumnsResult.rows);
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixWhatsAppNotificationsTable()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
