import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function diagnoseShiftsLoading() {
  console.log('🔍 DIAGNÓSTICO DE CARGA DE TURNOS Y PLANTILLAS');
  console.log('==============================================\n');

  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';

    console.log('📋 1. SHIFT TEMPLATES (plantillas disponibles):\n');
    const templatesResult = await pool.query(
      'SELECT * FROM shift_templates WHERE restaurant_id = $1 ORDER BY name',
      [restaurantId]
    );

    templatesResult.rows.forEach((template, index) => {
      const times = typeof template.times === 'string' ? JSON.parse(template.times) : template.times;
      console.log(`  Template ${index + 1}:`);
      console.log(`    - ID: ${template.id}`);
      console.log(`    - Name: ${template.name}`);
      console.log(`    - Times: ${Array.isArray(times) ? times.join(', ') : 'Invalid'}`);
      console.log('');
    });

    console.log('\n📋 2. SCHEDULES (configuración semanal):\n');
    const schedulesResult = await pool.query(
      'SELECT * FROM schedules WHERE restaurant_id = $1 ORDER BY day_of_week',
      [restaurantId]
    );

    schedulesResult.rows.forEach((schedule, index) => {
      const shifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : schedule.shifts;
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      console.log(`  Schedule ${index + 1}:`);
      console.log(`    - Day: ${dayNames[schedule.day_of_week]} (${schedule.day_of_week})`);
      console.log(`    - Is Open: ${schedule.is_open}`);
      console.log(`    - Shifts count: ${Array.isArray(shifts) ? shifts.length : 0}`);
      
      if (Array.isArray(shifts) && shifts.length > 0) {
        // Agrupar por templateId
        const groupedByTemplate: { [key: string]: any[] } = {};
        shifts.forEach((shift: any) => {
          const templateId = shift.templateId || 'unknown';
          if (!groupedByTemplate[templateId]) {
            groupedByTemplate[templateId] = [];
          }
          groupedByTemplate[templateId].push(shift);
        });

        Object.entries(groupedByTemplate).forEach(([templateId, templateShifts]) => {
          const template = templatesResult.rows.find(t => t.id === templateId);
          const templateName = template?.name || templateShifts[0]?.name || 'Unknown';
          console.log(`      Plantilla: ${templateName} (${templateId})`);
          console.log(`        - Shifts: ${templateShifts.length}`);
          console.log(`        - Times: ${templateShifts.map((s: any) => s.startTime).join(', ')}`);
          console.log(`        - MaxGuests: ${templateShifts[0]?.maxGuestsPerHour || 'N/A'}`);
        });
      }
      console.log('');
    });

    console.log('\n📋 3. DAY EXCEPTIONS (excepciones de días específicos):\n');
    const exceptionsResult = await pool.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND is_open = true ORDER BY date',
      [restaurantId]
    );

    console.log(`  Total excepciones abiertas: ${exceptionsResult.rows.length}\n`);

    for (const exception of exceptionsResult.rows.slice(0, 5)) {
      let dateString = exception.date;
      if (exception.date instanceof Date) {
        dateString = exception.date.toISOString().split('T')[0];
      } else if (typeof exception.date === 'string' && exception.date.includes('T')) {
        dateString = exception.date.split('T')[0];
      }

      console.log(`  Exception: ${dateString}`);
      console.log(`    - Is Open: ${exception.is_open}`);
      
      let shifts = [];
      try {
        shifts = typeof exception.template_ids === 'string' 
          ? JSON.parse(exception.template_ids) 
          : exception.template_ids;
      } catch (e) {
        console.log(`    ❌ Error parsing shifts: ${e}`);
      }

      console.log(`    - Shifts count: ${Array.isArray(shifts) ? shifts.length : 0}`);
      
      if (Array.isArray(shifts) && shifts.length > 0) {
        // Verificar estructura de shifts
        const firstShift = shifts[0];
        if (typeof firstShift === 'object' && firstShift !== null) {
          console.log(`    - Shift structure: OK (tiene templateId: ${!!firstShift.templateId})`);
          
          // Agrupar por templateId
          const groupedByTemplate: { [key: string]: any[] } = {};
          shifts.forEach((shift: any) => {
            const templateId = shift.templateId || 'unknown';
            if (!groupedByTemplate[templateId]) {
              groupedByTemplate[templateId] = [];
            }
            groupedByTemplate[templateId].push(shift);
          });

          Object.entries(groupedByTemplate).forEach(([templateId, templateShifts]) => {
            const template = templatesResult.rows.find(t => t.id === templateId);
            const templateName = template?.name || 'Unknown';
            console.log(`      Plantilla: ${templateName} (${templateId})`);
            console.log(`        - Shifts: ${templateShifts.length}`);
            console.log(`        - MaxGuests ejemplo: ${templateShifts[0]?.maxGuestsPerHour || 'N/A'}`);
          });
        } else {
          console.log(`    ❌ Shift structure: MAL (array de strings o IDs, no objetos completos)`);
        }
      } else {
        console.log(`    ⚠️  No hay shifts configurados para este día`);
      }
      console.log('');
    }

    console.log('\n📋 4. ANÁLISIS DE PROBLEMAS DETECTADOS:\n');
    
    // Problema 1: Verificar si hay schedules con shifts que no tienen el nombre correcto
    const schedulesWithProblems = schedulesResult.rows.filter(schedule => {
      const shifts = typeof schedule.shifts === 'string' ? JSON.parse(schedule.shifts) : schedule.shifts;
      if (!Array.isArray(shifts) || shifts.length === 0) return false;
      
      const groupedByTemplate: { [key: string]: any[] } = {};
      shifts.forEach((shift: any) => {
        const templateId = shift.templateId || 'unknown';
        if (!groupedByTemplate[templateId]) {
          groupedByTemplate[templateId] = [];
        }
        groupedByTemplate[templateId].push(shift);
      });

      return Object.keys(groupedByTemplate).some(templateId => {
        const template = templatesResult.rows.find(t => t.id === templateId);
        const shifts = groupedByTemplate[templateId];
        return shifts.some((s: any) => template && s.name !== template.name);
      });
    });

    if (schedulesWithProblems.length > 0) {
      console.log(`  ⚠️  Problema 1: ${schedulesWithProblems.length} schedules tienen nombres de plantilla incorrectos`);
      schedulesWithProblems.forEach(schedule => {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        console.log(`    - ${dayNames[schedule.day_of_week]}: shifts con nombre incorrecto`);
      });
    } else {
      console.log(`  ✅ Problema 1: Nombres de plantilla correctos en schedules`);
    }

    // Problema 2: Verificar excepciones sin shifts
    const exceptionsWithoutShifts = exceptionsResult.rows.filter(exception => {
      let shifts = [];
      try {
        shifts = typeof exception.template_ids === 'string' 
          ? JSON.parse(exception.template_ids) 
          : exception.template_ids;
      } catch {
        return true;
      }
      return !Array.isArray(shifts) || shifts.length === 0;
    });

    if (exceptionsWithoutShifts.length > 0) {
      console.log(`\n  ⚠️  Problema 2: ${exceptionsWithoutShifts.length} días abiertos sin shifts configurados`);
      exceptionsWithoutShifts.forEach(exception => {
        let dateString = exception.date;
        if (exception.date instanceof Date) {
          dateString = exception.date.toISOString().split('T')[0];
        }
        console.log(`    - ${dateString}`);
      });
      console.log(`\n    Esto causa que estos días no aparezcan en el buscador con horas disponibles.`);
    } else {
      console.log(`\n  ✅ Problema 2: Todos los días abiertos tienen shifts configurados`);
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseShiftsLoading().catch(console.error);
