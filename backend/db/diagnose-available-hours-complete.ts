import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
  ssl: { rejectUnauthorized: false },
});

async function diagnoseAvailableHoursComplete() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE HORAS DISPONIBLES EN BUSCADOR');
  console.log('='.repeat(60));

  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';
    console.log('\n📋 RESTAURANTE: O Lar de Pereiras');
    console.log(`   ID: ${restaurantId}`);

    console.log('\n📋 1. VERIFICAR CONFIGURACIÓN DEL RESTAURANTE:');
    const restaurantResult = await pool.query(
      'SELECT id, name, slug, is_active, min_booking_advance_minutes FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (restaurantResult.rows.length === 0) {
      console.log('  ❌ RESTAURANTE NO ENCONTRADO');
      return;
    }
    
    const restaurant = restaurantResult.rows[0];
    console.log(`\n  Restaurant ID: ${restaurant.id}`);
    console.log(`  Nombre: ${restaurant.name}`);
    console.log(`  Slug: ${restaurant.slug}`);
    console.log(`  Activo: ${restaurant.is_active ? '✅ Sí' : '❌ No'}`);
    console.log(`  Min booking advance: ${restaurant.min_booking_advance_minutes} minutos`);

    console.log('\n📋 2. SCHEDULES (Configuración semanal):');
    console.log('─'.repeat(60));
    const schedulesResult = await pool.query(
      `SELECT id, day_of_week, is_open, shifts 
       FROM schedules 
       WHERE restaurant_id = $1 
       ORDER BY day_of_week`,
      [restaurantId]
    );
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    if (schedulesResult.rows.length === 0) {
      console.log('  ⚠️  No hay schedules configurados');
    } else {
      schedulesResult.rows.forEach((s: any) => {
        const shifts = typeof s.shifts === 'string' ? JSON.parse(s.shifts) : s.shifts;
        const shiftsArray = Array.isArray(shifts) ? shifts : [];
        console.log(`\n  ${dayNames[s.day_of_week]}:`);
        console.log(`    - Estado: ${s.is_open ? '✅ ABIERTO' : '❌ CERRADO'}`);
        console.log(`    - Turnos configurados: ${shiftsArray.length}`);
        if (shiftsArray.length > 0) {
          shiftsArray.forEach((shift: any, idx: number) => {
            console.log(`      ${idx + 1}. ${shift.name || 'Sin nombre'}: ${shift.startTime} - ${shift.endTime} (max: ${shift.maxGuestsPerHour})`);
          });
        }
      });
    }

    console.log('\n📋 3. SHIFT TEMPLATES (Plantillas):');
    console.log('─'.repeat(60));
    const templatesResult = await pool.query(
      'SELECT id, name, times FROM shift_templates WHERE restaurant_id = $1',
      [restaurantId]
    );
    
    if (templatesResult.rows.length === 0) {
      console.log('  ⚠️  No hay plantillas de turnos');
    } else {
      templatesResult.rows.forEach((t: any) => {
        const times = typeof t.times === 'string' ? JSON.parse(t.times) : t.times;
        console.log(`\n  Template: ${t.name}`);
        console.log(`    - ID: ${t.id}`);
        console.log(`    - Horarios: ${times.join(', ')}`);
      });
    }

    console.log('\n📋 4. DAY EXCEPTIONS (Excepciones de días - próximos 14 días):');
    console.log('─'.repeat(60));
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);
    
    const exceptionsResult = await pool.query(
      `SELECT id, date, is_open, template_ids 
       FROM day_exceptions 
       WHERE restaurant_id = $1 
       AND date >= CURRENT_DATE 
       AND date <= CURRENT_DATE + INTERVAL '14 days'
       ORDER BY date`,
      [restaurantId]
    );
    
    if (exceptionsResult.rows.length === 0) {
      console.log('  ℹ️  No hay excepciones configuradas para los próximos 14 días');
    } else {
      exceptionsResult.rows.forEach((e: any) => {
        const dateStr = new Date(e.date).toISOString().split('T')[0];
        let templateIds: any[] = [];
        try {
          templateIds = typeof e.template_ids === 'string' ? JSON.parse(e.template_ids) : e.template_ids;
        } catch (err) {
          templateIds = [];
        }
        const shiftsArray = Array.isArray(templateIds) ? templateIds : [];
        
        console.log(`\n  ${dateStr}:`);
        console.log(`    - Estado: ${e.is_open ? '✅ ABIERTO' : '❌ CERRADO'}`);
        console.log(`    - Turnos configurados: ${shiftsArray.length}`);
        if (shiftsArray.length > 0 && typeof shiftsArray[0] === 'object') {
          shiftsArray.forEach((shift: any, idx: number) => {
            console.log(`      ${idx + 1}. ${shift.startTime} - ${shift.endTime} (max: ${shift.maxGuestsPerHour || 0})`);
          });
        }
      });
    }

    console.log('\n📋 5. SIMULACIÓN DE CONSULTA DE HORAS DISPONIBLES:');
    console.log('─'.repeat(60));
    
    const testDates = ['2026-01-15', '2026-01-16', '2026-01-17'];
    
    for (const testDate of testDates) {
      console.log(`\n  Consultando horas para: ${testDate}`);
      
      const testDateObj = new Date(testDate + 'T00:00:00.000Z');
      const dayOfWeek = testDateObj.getUTCDay();
      console.log(`    Día de la semana: ${dayNames[dayOfWeek]}`);
      
      const exceptionForDay = await pool.query(
        'SELECT id, date, is_open, template_ids FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
        [restaurantId, testDate]
      );
      
      let hasException = false;
      let isOpen = false;
      let hasShifts = false;
      let shifts: any[] = [];
      
      if (exceptionForDay.rows.length > 0) {
        hasException = true;
        const exc = exceptionForDay.rows[0];
        isOpen = exc.is_open;
        
        try {
          const templateIds = typeof exc.template_ids === 'string' ? JSON.parse(exc.template_ids) : exc.template_ids;
          if (Array.isArray(templateIds) && templateIds.length > 0) {
            if (typeof templateIds[0] === 'object' && templateIds[0] !== null && 'startTime' in templateIds[0]) {
              shifts = templateIds;
              hasShifts = true;
            }
          }
        } catch (e) {
          shifts = [];
        }
        
        console.log(`  🔍 Verificación de excepción:`);
        console.log(`    - Tiene excepción: ✅ Sí`);
        console.log(`    - isOpen: ${isOpen ? '✅' : '❌'}`);
        console.log(`    - Turnos: ${shifts.length}`);
      } else {
        console.log(`  🔍 Verificación de excepción:`);
        console.log(`    ℹ️  No hay excepción, usando schedule semanal`);
        
        const scheduleForDay = schedulesResult.rows.find((s: any) => s.day_of_week === dayOfWeek);
        if (scheduleForDay) {
          isOpen = scheduleForDay.is_open;
          try {
            const schedulShifts = typeof scheduleForDay.shifts === 'string' ? JSON.parse(scheduleForDay.shifts) : scheduleForDay.shifts;
            shifts = Array.isArray(schedulShifts) ? schedulShifts : [];
            hasShifts = shifts.length > 0;
          } catch (e) {
            shifts = [];
          }
          
          console.log(`    - Schedule encontrado: ✅`);
          console.log(`    - isOpen: ${isOpen ? '✅' : '❌'}`);
          console.log(`    - Turnos: ${shifts.length}`);
        } else {
          console.log(`    ⚠️  No hay schedule configurado para ${dayNames[dayOfWeek]}`);
        }
      }
      
      console.log(`\n  💡 SOLUCIÓN:`);
      if (!isOpen) {
        console.log(`     ❌ El día está CERRADO - No aparecerá en el buscador`);
        if (hasException) {
          console.log(`     🔧 Ir a Reservas Pro → Abrir el día ${testDate}`);
        } else {
          console.log(`     🔧 Ir a Módulo Horarios → Configurar ${dayNames[dayOfWeek]}`);
        }
      } else if (!hasShifts) {
        console.log(`     ⚠️ El día está ABIERTO pero SIN TURNOS`);
        console.log(`     📅 Aparecerá en el buscador pero SIN HORAS DISPONIBLES`);
        if (hasException) {
          console.log(`     🔧 Ir a Reservas Pro → Seleccionar ${testDate} → "Turnos para Hoy" → Configurar plantillas`);
        } else {
          console.log(`     🔧 Ir a Módulo Horarios → Configurar ${dayNames[dayOfWeek]} → Aplicar plantillas`);
        }
      } else {
        console.log(`     ✅ El día está correctamente configurado`);
        console.log(`     ✅ Aparecerá en el buscador CON HORAS DISPONIBLES`);
      }
    }

    console.log('\n📋 6. ANÁLISIS DE PROBLEMAS COMUNES:');
    console.log('─'.repeat(60));
    
    let issuesFound = 0;
    
    const openDaysWithoutShifts = schedulesResult.rows.filter((s: any) => {
      if (!s.is_open) return false;
      try {
        const shifts = typeof s.shifts === 'string' ? JSON.parse(s.shifts) : s.shifts;
        const shiftsArray = Array.isArray(shifts) ? shifts : [];
        return shiftsArray.length === 0;
      } catch (e) {
        return true;
      }
    });
    
    if (openDaysWithoutShifts.length > 0) {
      issuesFound++;
      console.log(`\n  ⚠️ PROBLEMA: Días abiertos sin turnos en schedules`);
      openDaysWithoutShifts.forEach((s: any) => {
        console.log(`    - ${dayNames[s.day_of_week]}: Abierto pero sin turnos configurados`);
      });
      console.log(`  🔧 SOLUCIÓN: Ir a Módulo Horarios y aplicar plantillas a estos días`);
    }
    
    const openExceptionsWithoutShifts = exceptionsResult.rows.filter((e: any) => {
      if (!e.is_open) return false;
      try {
        const templateIds = typeof e.template_ids === 'string' ? JSON.parse(e.template_ids) : e.template_ids;
        if (!Array.isArray(templateIds) || templateIds.length === 0) return true;
        if (typeof templateIds[0] !== 'object' || !('startTime' in templateIds[0])) return true;
        return false;
      } catch (e) {
        return true;
      }
    });
    
    if (openExceptionsWithoutShifts.length > 0) {
      issuesFound++;
      console.log(`\n  ⚠️ PROBLEMA: Excepciones abiertas sin turnos configurados`);
      openExceptionsWithoutShifts.forEach((e: any) => {
        const dateStr = new Date(e.date).toISOString().split('T')[0];
        console.log(`    - ${dateStr}: Abierto pero sin turnos`);
      });
      console.log(`  🔧 SOLUCIÓN: Ir a Reservas Pro → Seleccionar cada día → "Turnos para Hoy" → Configurar plantillas`);
    }
    
    const invalidSchedules = schedulesResult.rows.filter((s: any) => {
      if (!s.is_open) return false;
      try {
        const shifts = typeof s.shifts === 'string' ? JSON.parse(s.shifts) : s.shifts;
        if (!Array.isArray(shifts)) return true;
        return shifts.some((shift: any) => !shift.startTime || !shift.endTime || !shift.maxGuestsPerHour);
      } catch (e) {
        return true;
      }
    });
    
    if (invalidSchedules.length > 0) {
      issuesFound++;
      console.log(`\n  ⚠️ PROBLEMA: Schedules con configuración inválida`);
      invalidSchedules.forEach((s: any) => {
        console.log(`    - ${dayNames[s.day_of_week]}: Datos incompletos o corruptos`);
      });
      console.log(`  🔧 SOLUCIÓN: Eliminar y volver a configurar estos días en Módulo Horarios`);
    }
    
    if (issuesFound === 0) {
      console.log(`\n  ✅ No hay schedules con problemas de configuración`);
    }
    
    if (openExceptionsWithoutShifts.length === 0) {
      console.log(`\n  ✅ Todas las excepciones tienen configuración válida`);
    }

    console.log('\n📊 RESUMEN:');
    console.log('═'.repeat(60));
    console.log(`  Schedules configurados: ${schedulesResult.rows.filter((s: any) => s.is_open).length}/7 días`);
    console.log(`  Plantillas de turnos: ${templatesResult.rows.length}`);
    console.log(`  Excepciones próximos 14 días: ${exceptionsResult.rows.length}`);
    console.log(`  Días con problemas de turnos: ${issuesFound}`);
    
    if (issuesFound > 0) {
      console.log(`\n  ⚠️ SE DETECTARON ${issuesFound} PROBLEMA(S) QUE IMPIDEN MOSTRAR HORAS`);
    } else {
      console.log(`\n  ✅ No se detectaron problemas críticos`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseAvailableHoursComplete();
