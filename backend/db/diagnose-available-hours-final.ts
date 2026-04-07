import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function diagnoseAvailableHours() {
  console.log('\n🔍 DIAGNÓSTICO DEFINITIVO: HORAS DISPONIBLES EN BUSCADOR');
  console.log('═'.repeat(80));
  
  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';
    console.log('\n📋 RESTAURANTE: O Lar de Pereiras');
    console.log(`   ID: ${restaurantId}`);
    
    console.log('\n📋 1. SCHEDULES (Horario Semanal):');
    console.log('─'.repeat(60));
    const schedulesResult = await pool.query(
      'SELECT * FROM schedules WHERE restaurant_id = $1 ORDER BY day_of_week',
      [restaurantId]
    );
    
    for (const schedule of schedulesResult.rows) {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      console.log(`\n  ${dayNames[schedule.day_of_week]}:`);
      console.log(`    - Abierto: ${schedule.is_open}`);
      
      let shifts = [];
      try {
        shifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : schedule.shifts;
      } catch {
        console.log(`    ⚠️  Error parseando shifts`);
      }
      
      console.log(`    - Shifts: ${Array.isArray(shifts) ? shifts.length : 0}`);
      if (Array.isArray(shifts) && shifts.length > 0) {
        shifts.forEach((shift: any, idx: number) => {
          console.log(`      [${idx + 1}] Template: ${shift.templateId}, Horario: ${shift.startTime}-${shift.endTime}, Max: ${shift.maxGuestsPerHour}`);
        });
      }
    }
    
    console.log('\n📋 2. DAY EXCEPTIONS (Excepciones de días):');
    console.log('─'.repeat(60));
    const exceptionsResult = await pool.query(
      `SELECT * FROM day_exceptions 
       WHERE restaurant_id = $1 
       AND date >= CURRENT_DATE 
       AND date <= CURRENT_DATE + INTERVAL '14 days'
       ORDER BY date`,
      [restaurantId]
    );
    
    console.log(`   Total excepciones (próximos 14 días): ${exceptionsResult.rows.length}\n`);
    
    for (const exception of exceptionsResult.rows) {
      const date = new Date(exception.date);
      console.log(`  Fecha: ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`);
      console.log(`    - ID: ${exception.id}`);
      console.log(`    - Abierto: ${exception.is_open}`);
      console.log(`    - template_ids tipo: ${typeof exception.template_ids}`);
      console.log(`    - template_ids raw:`, JSON.stringify(exception.template_ids).substring(0, 200));
      
      let shifts = [];
      try {
        shifts = typeof exception.template_ids === 'string' 
          ? JSON.parse(exception.template_ids) 
          : exception.template_ids;
      } catch {
        console.log(`    ⚠️  Error parseando shifts`);
      }
      
      console.log(`    - Shifts parseados: ${Array.isArray(shifts) ? shifts.length : 'No es array'}`);
      
      if (Array.isArray(shifts)) {
        if (shifts.length === 0) {
          console.log(`    ⚠️  PROBLEMA: Día abierto pero sin shifts configurados`);
        } else {
          const firstShift = shifts[0];
          console.log(`    - Formato de shift:`, typeof firstShift);
          
          if (typeof firstShift === 'object' && firstShift !== null) {
            if ('startTime' in firstShift) {
              console.log(`    ✅ Formato completo - Ejemplo:`, JSON.stringify(shifts[0]));
              shifts.forEach((shift: any, idx: number) => {
                console.log(`      [${idx + 1}] ${shift.startTime}-${shift.endTime}, Max: ${shift.maxGuestsPerHour}`);
              });
            } else {
              console.log(`    ⚠️  Formato incompleto - Ejemplo:`, JSON.stringify(firstShift));
            }
          } else {
            console.log(`    ⚠️  Shift no es objeto:`, firstShift);
          }
        }
      }
      console.log('');
    }
    
    console.log('\n📋 3. SHIFT TEMPLATES (Plantillas):');
    console.log('─'.repeat(60));
    const templatesResult = await pool.query(
      'SELECT * FROM shift_templates WHERE restaurant_id = $1',
      [restaurantId]
    );
    
    for (const template of templatesResult.rows) {
      console.log(`\n  ${template.name}:`);
      console.log(`    - ID: ${template.id}`);
      let times = [];
      try {
        times = typeof template.time_slots === 'string' 
          ? JSON.parse(template.time_slots) 
          : template.time_slots;
      } catch {
        console.log(`    ⚠️  Error parseando time_slots`);
      }
      console.log(`    - Horarios: ${Array.isArray(times) ? times.join(', ') : 'Error'}`);
    }
    
    console.log('\n📋 4. SIMULACIÓN DE CONSULTA DE HORAS DISPONIBLES:');
    console.log('─'.repeat(60));
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 5);
    const dateString = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
    const dayOfWeek = testDate.getDay();
    
    console.log(`\n  Fecha de prueba: ${testDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    console.log(`  DateString: ${dateString}`);
    console.log(`  DayOfWeek: ${dayOfWeek}`);
    
    const exceptionCheck = await pool.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
      [restaurantId, dateString]
    );
    
    if (exceptionCheck.rows.length > 0) {
      const exc = exceptionCheck.rows[0];
      console.log(`\n  ✅ Hay excepción configurada:`);
      console.log(`     - Abierto: ${exc.is_open}`);
      
      let shifts = [];
      try {
        shifts = typeof exc.template_ids === 'string' 
          ? JSON.parse(exc.template_ids) 
          : exc.template_ids;
      } catch {
        console.log(`     ⚠️  Error parseando shifts`);
      }
      
      if (Array.isArray(shifts) && shifts.length > 0 && shifts[0]?.startTime) {
        console.log(`     ✅ Shifts válidos: ${shifts.length}`);
        console.log(`     - Ejemplo: ${shifts[0].startTime} - ${shifts[0].endTime}`);
      } else {
        console.log(`     ❌ PROBLEMA: Shifts inválidos o vacíos`);
        console.log(`     - Tipo: ${typeof shifts}`);
        console.log(`     - Es array: ${Array.isArray(shifts)}`);
        console.log(`     - Length: ${Array.isArray(shifts) ? shifts.length : 'N/A'}`);
        if (Array.isArray(shifts) && shifts.length > 0) {
          console.log(`     - Primer elemento:`, JSON.stringify(shifts[0]));
        }
      }
    } else {
      console.log(`\n  ℹ️  No hay excepción, usando schedule semanal`);
      
      const scheduleCheck = await pool.query(
        'SELECT * FROM schedules WHERE restaurant_id = $1 AND day_of_week = $2',
        [restaurantId, dayOfWeek]
      );
      
      if (scheduleCheck.rows.length > 0) {
        const sch = scheduleCheck.rows[0];
        console.log(`     - Abierto: ${sch.is_open}`);
        
        let shifts = [];
        try {
          shifts = typeof sch.shifts === 'string' ? JSON.parse(sch.shifts) : sch.shifts;
        } catch {
          console.log(`     ⚠️  Error parseando shifts`);
        }
        
        console.log(`     - Shifts: ${Array.isArray(shifts) ? shifts.length : 0}`);
        if (Array.isArray(shifts) && shifts.length > 0) {
          console.log(`     - Ejemplo: ${shifts[0].startTime} - ${shifts[0].endTime}`);
        }
      } else {
        console.log(`     ⚠️  No hay schedule configurado para este día`);
      }
    }
    
    console.log('\n📋 5. ANÁLISIS DE PROBLEMAS:');
    console.log('─'.repeat(60));
    
    const problemExceptions = await pool.query(
      `SELECT * FROM day_exceptions 
       WHERE restaurant_id = $1 
       AND is_open = true
       AND date >= CURRENT_DATE`,
      [restaurantId]
    );
    
    let problemCount = 0;
    for (const exc of problemExceptions.rows) {
      let shifts = [];
      try {
        shifts = typeof exc.template_ids === 'string' 
          ? JSON.parse(exc.template_ids) 
          : exc.template_ids;
      } catch {
        // Error parseando
      }
      
      const isProblematic = !Array.isArray(shifts) || 
                            shifts.length === 0 || 
                            !shifts[0]?.startTime;
      
      if (isProblematic) {
        problemCount++;
        const date = new Date(exc.date);
        console.log(`\n  ⚠️  PROBLEMA en ${date.toLocaleDateString('es-ES')}:`);
        console.log(`     - ID: ${exc.id}`);
        console.log(`     - Abierto: true pero sin shifts válidos`);
        console.log(`     - Shifts:`, JSON.stringify(shifts).substring(0, 100));
      }
    }
    
    if (problemCount === 0) {
      console.log('\n  ✅ No se encontraron días abiertos sin turnos configurados');
    } else {
      console.log(`\n  ❌ Se encontraron ${problemCount} días con problemas`);
    }
    
    console.log('\n📊 RESUMEN:');
    console.log('═'.repeat(80));
    console.log(`  Schedules configurados: ${schedulesResult.rows.filter((r: any) => r.is_open).length}/7 días`);
    console.log(`  Excepciones próximos 14 días: ${exceptionsResult.rows.length}`);
    console.log(`  Plantillas de turnos: ${templatesResult.rows.length}`);
    console.log(`  Días con problemas: ${problemCount}`);
    
    console.log('\n✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseAvailableHours();
