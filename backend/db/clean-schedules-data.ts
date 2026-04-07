import { Pool } from 'pg';

console.log('🧹 Limpiando datos antiguos de schedules y day_exceptions...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function cleanSchedulesData() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('🔄 Limpiando datos de schedules...');
    const schedulesResult = await client.query('DELETE FROM schedules');
    console.log(`✅ ${schedulesResult.rowCount} registros eliminados de schedules`);

    console.log('🔄 Limpiando datos de day_exceptions...');
    const exceptionsResult = await client.query('DELETE FROM day_exceptions');
    console.log(`✅ ${exceptionsResult.rowCount} registros eliminados de day_exceptions`);

    console.log('\n✅ Datos antiguos limpiados exitosamente');
    console.log('💡 Ahora puedes configurar tus horarios desde cero en:');
    console.log('   📅 https://quieromesa.com/restaurant/schedules');
    console.log('   📅 https://quieromesa.com/restaurant/reservations-pro');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanSchedulesData();
