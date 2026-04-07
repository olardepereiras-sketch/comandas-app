import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanTestData() {
  console.log('🧹 LIMPIANDO DATOS DE PRUEBA');
  console.log('================================================================================\n');

  try {
    console.log('📋 1. Eliminando todas las reservas...');
    const deleteReservations = await pool.query('DELETE FROM reservations');
    console.log(`✅ ${deleteReservations.rowCount} reservas eliminadas\n`);

    console.log('📋 2. Eliminando todas las excepciones de día...');
    const deleteDayExceptions = await pool.query('DELETE FROM day_exceptions');
    console.log(`✅ ${deleteDayExceptions.rowCount} excepciones de día eliminadas\n`);

    console.log('📋 3. Verificando horarios base (schedules)...');
    const schedules = await pool.query('SELECT * FROM schedules ORDER BY day_of_week');
    console.log(`✅ ${schedules.rowCount} horarios base encontrados (estos NO se borran)\n`);
    
    schedules.rows.forEach((schedule: any) => {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      console.log(`   ${dayNames[schedule.day_of_week]}: ${schedule.is_open ? 'ABIERTO' : 'CERRADO'}`);
    });

    console.log('\n================================================================================');
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('================================================================================\n');
    console.log('📌 RESUMEN:');
    console.log(`   - Reservas eliminadas: ${deleteReservations.rowCount}`);
    console.log(`   - Excepciones de día eliminadas: ${deleteDayExceptions.rowCount}`);
    console.log(`   - Horarios base mantenidos: ${schedules.rowCount}`);
    console.log('\n✅ La base de datos está limpia y lista para pruebas nuevas');
    
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanTestData().catch(console.error);
