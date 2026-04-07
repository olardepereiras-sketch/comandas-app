import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
  ssl: { rejectUnauthorized: false },
});

async function diagnoseAvailableHours() {
  console.log('🔍 DIAGNÓSTICO DE HORAS DISPONIBLES EN BUSCADOR');
  console.log('='.repeat(60));

  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';
    const testDate = '2026-01-15';

    console.log('\n📋 1. VERIFICAR RESTAURANT:');
    const restaurantResult = await pool.query(
      'SELECT id, name, slug, is_active FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    console.log('  Restaurant:', restaurantResult.rows[0]);

    console.log('\n📋 2. VERIFICAR SCHEDULES (días de la semana):');
    const schedulesResult = await pool.query(
      'SELECT id, day_of_week, is_open, shifts FROM schedules WHERE restaurant_id = $1 ORDER BY day_of_week',
      [restaurantId]
    );
    console.log(`  Total schedules: ${schedulesResult.rows.length}`);
    schedulesResult.rows.forEach((s: any) => {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const shifts = typeof s.shifts === 'string' ? JSON.parse(s.shifts) : s.shifts;
      console.log(`  - ${dayNames[s.day_of_week]}: ${s.is_open ? 'ABIERTO' : 'CERRADO'} - ${shifts?.length || 0} turnos`);
    });

    console.log('\n📋 3. VERIFICAR DAY_EXCEPTIONS (días específicos):');
    const exceptionsResult = await pool.query(
      `SELECT id, date, is_open, template_ids 
       FROM day_exceptions 
       WHERE restaurant_id = $1 
       ORDER BY date`,
      [restaurantId]
    );
    console.log(`  Total exceptions: ${exceptionsResult.rows.length}`);
    exceptionsResult.rows.forEach((e: any) => {
      const date = new Date(e.date);
      const templateIds = typeof e.template_ids === 'string' ? JSON.parse(e.template_ids) : e.template_ids;
      console.log(`  - ${date.toISOString().split('T')[0]}: ${e.is_open ? 'ABIERTO' : 'CERRADO'} - ${templateIds?.length || 0} turnos`);
    });

    console.log('\n📋 4. ANALIZAR DÍA ESPECÍFICO:', testDate);
    const testDateObj = new Date(testDate + 'T00:00:00.000Z');
    const dayOfWeek = testDateObj.getUTCDay();
    console.log(`  Día de la semana: ${dayOfWeek} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek]})`);

    // Buscar exception para este día
    const exceptionForDay = await pool.query(
      `SELECT id, date, is_open, template_ids 
       FROM day_exceptions 
       WHERE restaurant_id = $1 AND date = $2`,
      [restaurantId, testDate]
    );

    if (exceptionForDay.rows.length > 0) {
      const exc = exceptionForDay.rows[0];
      const templateIds = typeof exc.template_ids === 'string' ? JSON.parse(exc.template_ids) : exc.template_ids;
      console.log('  ✅ Exception encontrada:', {
        id: exc.id,
        isOpen: exc.is_open,
        shiftsCount: templateIds?.length || 0,
      });
      
      if (templateIds && templateIds.length > 0) {
        console.log('  Turnos configurados:');
        templateIds.forEach((shift: any, idx: number) => {
          console.log(`    ${idx + 1}. ${shift.startTime} - ${shift.endTime} (max: ${shift.maxGuestsPerHour})`);
        });
      } else {
        console.log('  ⚠️ NO HAY TURNOS EN LA EXCEPTION');
      }
    } else {
      console.log('  ℹ️ No hay exception, usando schedule semanal');
      const scheduleForDay = schedulesResult.rows.find((s: any) => s.day_of_week === dayOfWeek);
      if (scheduleForDay) {
        const shifts = typeof scheduleForDay.shifts === 'string' ? JSON.parse(scheduleForDay.shifts) : scheduleForDay.shifts;
        console.log('  Schedule encontrado:', {
          isOpen: scheduleForDay.is_open,
          shiftsCount: shifts?.length || 0,
        });
        
        if (shifts && shifts.length > 0) {
          console.log('  Turnos configurados:');
          shifts.forEach((shift: any, idx: number) => {
            console.log(`    ${idx + 1}. ${shift.startTime} - ${shift.endTime} (max: ${shift.maxGuestsPerHour || 0})`);
          });
        } else {
          console.log('  ⚠️ NO HAY TURNOS EN EL SCHEDULE');
        }
      } else {
        console.log('  ❌ NO HAY SCHEDULE PARA ESTE DÍA');
      }
    }

    console.log('\n📋 5. SIMULAR LÓGICA DEL BUSCADOR:');
    console.log('  Paso 1: ¿El día está abierto?');
    
    let isOpen = false;
    let hasShifts = false;
    
    if (exceptionForDay.rows.length > 0) {
      const exc = exceptionForDay.rows[0];
      isOpen = exc.is_open;
      const templateIds = typeof exc.template_ids === 'string' ? JSON.parse(exc.template_ids) : exc.template_ids;
      hasShifts = templateIds && templateIds.length > 0;
      console.log(`    - Exception: isOpen=${isOpen}, hasShifts=${hasShifts}`);
    } else {
      const scheduleForDay = schedulesResult.rows.find((s: any) => s.day_of_week === dayOfWeek);
      if (scheduleForDay) {
        isOpen = scheduleForDay.is_open;
        const shifts = typeof scheduleForDay.shifts === 'string' ? JSON.parse(scheduleForDay.shifts) : scheduleForDay.shifts;
        hasShifts = shifts && shifts.length > 0;
        console.log(`    - Schedule: isOpen=${isOpen}, hasShifts=${hasShifts}`);
      }
    }

    console.log('\n  Paso 2: ¿Aparecerá en el buscador?');
    if (!isOpen) {
      console.log('    ❌ NO - El día está cerrado');
    } else if (!hasShifts) {
      console.log('    ⚠️ APARECE PERO SIN HORAS - No tiene turnos configurados');
      console.log('    🔧 SOLUCIÓN: Configurar turnos en el día');
    } else {
      console.log('    ✅ SÍ - Día abierto con turnos configurados');
    }

    console.log('\n📋 6. VERIFICAR TABLAS:');
    const tablesResult = await pool.query(
      'SELECT COUNT(*) as count FROM tables WHERE restaurant_id = $1',
      [restaurantId]
    );
    console.log(`  Total mesas: ${tablesResult.rows[0].count}`);
    if (tablesResult.rows[0].count === 0) {
      console.log('  ⚠️ NO HAY MESAS CONFIGURADAS');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseAvailableHours();
