import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixCriticalSchema() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    console.log('📋 1. Arreglando whatsapp_notifications...');
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
    `);
    
    const hasUpdatedAt = columnsResult.rows.some((row: any) => row.column_name === 'updated_at');
    
    if (hasUpdatedAt) {
      console.log('🔧 Eliminando columna updated_at...');
      await client.query(`ALTER TABLE whatsapp_notifications DROP COLUMN IF EXISTS updated_at`);
      console.log('✅ Columna updated_at eliminada');
    } else {
      console.log('✅ Columna updated_at ya no existe');
    }

    console.log('📋 2. Verificando estructura de reservations...');
    const reservationColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `);
    console.log('✅ Columnas de reservations:', reservationColumns.rows.map(r => r.column_name).join(', '));

    console.log('📋 3. Actualizando credenciales de admin...');
    await client.query(`
      UPDATE clients 
      SET name = 'tono77', phone = '1500'
      WHERE phone = '1234' OR phone = 'tono'
    `);
    console.log('✅ Credenciales de admin actualizadas a tono77/1500');

    console.log('✅ ¡Schema arreglado exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCriticalSchema()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
