import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false }
});

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DE HORAS DISPONIBLES');
  console.log('==========================================================\n');

  try {
    // Obtener restaurante por slug
    const restaurantSlug = 'o-lar-de-pereiras';
    console.log(`📋 1. BUSCAR RESTAURANTE: ${restaurantSlug}`);
    
    const restaurantResult = await pool.query(
      'SELECT * FROM restaurants WHERE slug = $1',
      [restaurantSlug]
    );

    if (restaurantResult.rows.length === 0) {
      console.log('❌ Restaurante no encontrado');
      return;
    }

    const restaurant = restaurantResult.rows[0];
    console.log(`✅ Restaurante encontrado: ${restaurant.name} (${restaurant.id})`);
    console.log(`   Min booking advance: ${restaurant.min_booking_advance_minutes} minutos\n`);

    // Obtener schedules (horario semanal)
    console.log('📋 2. SCHEDULES (Horario Semanal):');
    const schedulesResult = await pool.query(
      'SELECT * FROM schedules WHERE restaurant_id = $1 ORDER BY day_of_week',
      [restaurant.id]
    );
    
    console.log(`   Total schedules: ${schedulesResult.rows.length}`);
    schedulesResult.rows.forEach((schedule) => {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      console.log(`   - ${dayNames[schedule.day_of_week]}: ${schedule.is_open ? 'Abierto' : 'Cerrado'}`);
      if (schedule.is_open) {
        const shifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : schedule.shifts;
        console.log(`     Shifts: ${shifts.length} configurados`);
        if (shifts.length > 0) {
          console.log(`     Primer shift:`, shifts[0]);
        }
      }
    });
    console.log('');

    // Obtener shift templates
    console.log('📋 3. SHIFT TEMPLATES (Plantillas):');
    const templatesResult = await pool.query(
      'SELECT * FROM shift_templates WHERE restaurant_id = $1',
      [restaurant.id]
    );
    
    console.log(`   Total templates: ${templatesResult.rows.length}`);
    templatesResult.rows.forEach((template) => {
      const times = typeof template.times === 'string' ? JSON.parse(template.times) : template.times;
      console.log(`   - ${template.name}:`);
      console.log(`     ID: ${template.id}`);
      console.log(`     Times: ${times.join(', ')}`);
    });
    console.log('');

    // Obtener day exceptions (próximos 14 días)
    console.log('📋 4. DAY EXCEPTIONS (Excepciones):');
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 14);
    
    const exceptionsResult = await pool.query(
      `SELECT * FROM day_exceptions 
       WHERE restaurant_id = $1 
       AND date >= $2 
       AND date <= $3
       ORDER BY date`,
      [restaurant.id, today, futureDate]
    );
    
    console.log(`   Total exceptions (próximos 14 días): ${exceptionsResult.rows.length}`);
    if (exceptionsResult.rows.length === 0) {
      console.log('   ℹ️  No hay excepciones configuradas');
    } else {
      exceptionsResult.rows.forEach((exception) => {
        const date = new Date(exception.date);
        const dateStr = date.toISOString().split('T')[0];
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dayName = dayNames[date.getDay()];
        
        console.log(`   - ${dateStr} (${dayName}): ${exception.is_open ? '🟢 Abierto' : '🔴 Cerrado'}`);
        
        if (exception.is_open) {
          const shifts = typeof exception.shifts === 'string' ? JSON.parse(exception.shifts) : exception.shifts;
          console.log(`     Shifts: ${Array.isArray(shifts) ? shifts.length : 0}`);
          
          if (Array.isArray(shifts) && shifts.length > 0) {
            console.log(`     Primer shift:`, shifts[0]);
          } else {
            console.log(`     ⚠️  DÍA ABIERTO PERO SIN SHIFTS CONFIGURADOS`);
          }
        }
      });
    }
    console.log('');

    // Simular consulta de horas disponibles
    console.log('📋 5. SIMULACIÓN DE AVAILABLE SLOTS:');
    const testDate = '2026-01-15'; // Miércoles
    console.log(`   Fecha de prueba: ${testDate}`);
    
    // Verificar si hay excepción
    const testException = exceptionsResult.rows.find(ex => {
      const exDate = new Date(ex.date);
      const exDateStr = exDate.toISOString().split('T')[0];
      return exDateStr === testDate;
    });
    
    if (testException) {
      console.log(`   ✅ Excepción encontrada: ${testException.is_open ? 'Abierto' : 'Cerrado'}`);
      const shifts = typeof testException.shifts === 'string' ? JSON.parse(testException.shifts) : testException.shifts;
      console.log(`   Shifts: ${Array.isArray(shifts) ? shifts.length : 0}`);
      
      if (Array.isArray(shifts) && shifts.length > 0) {
        console.log(`   Horarios disponibles:`);
        shifts.forEach((shift: any) => {
          console.log(`     - ${shift.startTime} (max ${shift.maxGuestsPerHour} comensales/h)`);
        });
      } else {
        console.log(`   ⚠️  PROBLEMA: Día abierto pero sin shifts`);
        console.log(`   💡 SOLUCIÓN: Configurar turnos en el calendario para este día`);
      }
    } else {
      // Buscar en schedules
      const testDateObj = new Date(testDate);
      const dayOfWeek = testDateObj.getDay();
      const schedule = schedulesResult.rows.find(s => s.day_of_week === dayOfWeek);
      
      if (schedule) {
        console.log(`   ✅ Schedule encontrado (día ${dayOfWeek}): ${schedule.is_open ? 'Abierto' : 'Cerrado'}`);
        if (schedule.is_open) {
          const shifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : schedule.shifts;
          console.log(`   Shifts: ${shifts.length}`);
          if (shifts.length > 0) {
            console.log(`   Horarios disponibles:`);
            shifts.slice(0, 3).forEach((shift: any) => {
              console.log(`     - ${shift.startTime} (max ${shift.maxGuestsPerHour} comensales/h)`);
            });
          }
        }
      } else {
        console.log(`   ⚠️  No hay configuración para este día`);
      }
    }

    console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
    console.log('═══════════════════════════');
    
    // Detectar problemas
    const problems: string[] = [];
    const openExceptionsWithoutShifts = exceptionsResult.rows.filter((ex: any) => {
      if (!ex.is_open) return false;
      const shifts = typeof ex.shifts === 'string' ? JSON.parse(ex.shifts) : ex.shifts;
      return !Array.isArray(shifts) || shifts.length === 0;
    });
    
    if (openExceptionsWithoutShifts.length > 0) {
      problems.push(`❌ ${openExceptionsWithoutShifts.length} día(s) abierto(s) sin turnos configurados`);
      console.log(`\n⚠️  PROBLEMA DETECTADO:`);
      console.log(`   Hay ${openExceptionsWithoutShifts.length} días marcados como abiertos pero sin turnos:`);
      openExceptionsWithoutShifts.forEach((ex: any) => {
        const date = new Date(ex.date);
        console.log(`   - ${date.toISOString().split('T')[0]}`);
      });
      console.log(`\n💡 SOLUCIÓN:`);
      console.log(`   1. Ir a Reservas Pro`);
      console.log(`   2. Seleccionar el día`);
      console.log(`   3. Pulsar "Turnos para Hoy"`);
      console.log(`   4. Seleccionar las plantillas de turnos`);
      console.log(`   5. Guardar cambios`);
    }
    
    if (problems.length === 0) {
      console.log(`\n✅ No se detectaron problemas en la configuración`);
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnose();
