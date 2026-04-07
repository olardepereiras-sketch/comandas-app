import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixDayExceptionsShifts() {
  console.log('\n🔧 CORRIGIENDO DAY EXCEPTIONS SIN SHIFTS VÁLIDOS');
  console.log('═'.repeat(80));
  
  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';
    
    console.log('\n📋 Paso 1: Buscando excepciones problemáticas...');
    const problemExceptions = await pool.query(
      `SELECT * FROM day_exceptions 
       WHERE restaurant_id = $1 
       AND is_open = true
       AND date >= CURRENT_DATE
       ORDER BY date`,
      [restaurantId]
    );
    
    console.log(`Encontradas ${problemExceptions.rows.length} excepciones abiertas`);
    
    let fixedCount = 0;
    
    for (const exc of problemExceptions.rows) {
      let shifts = [];
      try {
        shifts = typeof exc.template_ids === 'string' 
          ? JSON.parse(exc.template_ids) 
          : exc.template_ids;
      } catch {
        shifts = [];
      }
      
      const needsFix = !Array.isArray(shifts) || 
                       shifts.length === 0 || 
                       !shifts[0]?.startTime;
      
      if (needsFix) {
        const date = new Date(exc.date);
        const dayOfWeek = date.getDay();
        
        console.log(`\n🔧 Corrigiendo ${date.toLocaleDateString('es-ES')}...`);
        console.log(`   Day of week: ${dayOfWeek}`);
        
        const scheduleResult = await pool.query(
          'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
          [restaurantId, dayOfWeek]
        );
        
        if (scheduleResult.rows.length > 0 && scheduleResult.rows[0].is_open) {
          const schedule = scheduleResult.rows[0];
          let scheduleShifts = [];
          
          try {
            scheduleShifts = typeof schedule.shifts === 'string' 
              ? JSON.parse(schedule.shifts) 
              : schedule.shifts;
          } catch {
            console.log(`   ⚠️  Error parseando shifts del schedule`);
            continue;
          }
          
          if (Array.isArray(scheduleShifts) && scheduleShifts.length > 0 && scheduleShifts[0]?.startTime) {
            console.log(`   ✅ Heredando ${scheduleShifts.length} shifts del schedule semanal`);
            
            await pool.query(
              `UPDATE day_exceptions 
               SET template_ids = $1
               WHERE id = $2`,
              [JSON.stringify(scheduleShifts), exc.id]
            );
            
            fixedCount++;
            console.log(`   ✅ Corrección aplicada`);
          } else {
            console.log(`   ⚠️  Schedule sin shifts válidos, cerrando día...`);
            await pool.query(
              `UPDATE day_exceptions 
               SET is_open = false
               WHERE id = $1`,
              [exc.id]
            );
          }
        } else {
          console.log(`   ⚠️  No hay schedule para este día, cerrando...`);
          await pool.query(
            `UPDATE day_exceptions 
             SET is_open = false
             WHERE id = $1`,
            [exc.id]
          );
        }
      }
    }
    
    console.log('\n📊 RESUMEN:');
    console.log('═'.repeat(80));
    console.log(`  Excepciones corregidas: ${fixedCount}`);
    console.log('\n✅ Corrección completada\n');
    
  } catch (error) {
    console.error('❌ Error en corrección:', error);
  } finally {
    await pool.end();
  }
}

fixDayExceptionsShifts();
