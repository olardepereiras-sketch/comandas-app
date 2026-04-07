import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT!.replace('libsql://', 'postgresql://');

async function diagnoseCompleteData() {
  const pool = new Pool({ connectionString });

  try {
    console.log('\n🔍 ========== DIAGNÓSTICO COMPLETO DE BASE DE DATOS ==========\n');

    // 1. SCHEDULES (Horarios Base)
    console.log('📅 ===== SCHEDULES (HORARIOS BASE) =====');
    const schedulesResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        day_of_week,
        is_open,
        start_time,
        end_time,
        max_guests_per_shift,
        created_at
      FROM schedules
      ORDER BY day_of_week, created_at DESC
    `);
    
    if (schedulesResult.rows.length === 0) {
      console.log('❌ No hay horarios base configurados');
    } else {
      console.log(`✅ Total: ${schedulesResult.rows.length} horarios base`);
      schedulesResult.rows.forEach((row, idx) => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        console.log(`\n  [${idx + 1}] ${days[row.day_of_week]}`);
        console.log(`      ID: ${row.id}`);
        console.log(`      Restaurant: ${row.restaurant_id}`);
        console.log(`      Abierto: ${row.is_open ? 'SÍ' : 'NO'}`);
        console.log(`      Horario: ${row.start_time || 'N/A'} - ${row.end_time || 'N/A'}`);
        console.log(`      Max guests/shift: ${row.max_guests_per_shift || 'N/A'}`);
        console.log(`      Creado: ${row.created_at}`);
      });
    }

    // 2. SHIFT TEMPLATES (Plantillas de turnos)
    console.log('\n\n🎯 ===== SHIFT TEMPLATES (PLANTILLAS DE TURNOS) =====');
    const templatesResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        schedule_id,
        start_time,
        end_time,
        max_guests,
        priority,
        created_at
      FROM shift_templates
      ORDER BY schedule_id, start_time
    `);
    
    if (templatesResult.rows.length === 0) {
      console.log('❌ No hay plantillas de turnos configuradas');
    } else {
      console.log(`✅ Total: ${templatesResult.rows.length} plantillas de turnos`);
      templatesResult.rows.forEach((row, idx) => {
        console.log(`\n  [${idx + 1}] Turno`);
        console.log(`      ID: ${row.id}`);
        console.log(`      Schedule ID: ${row.schedule_id}`);
        console.log(`      Horario: ${row.start_time} - ${row.end_time}`);
        console.log(`      Max guests: ${row.max_guests}`);
        console.log(`      Priority: ${row.priority}`);
        console.log(`      Creado: ${row.created_at}`);
      });
    }

    // 3. DAY EXCEPTIONS (Excepciones de calendario)
    console.log('\n\n📆 ===== DAY EXCEPTIONS (EXCEPCIONES DE CALENDARIO) =====');
    const exceptionsResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        date,
        is_open,
        shifts,
        notes,
        created_at,
        updated_at
      FROM day_exceptions
      ORDER BY date DESC
      LIMIT 50
    `);
    
    if (exceptionsResult.rows.length === 0) {
      console.log('❌ No hay excepciones de calendario');
    } else {
      console.log(`✅ Total: ${exceptionsResult.rows.length} excepciones (mostrando últimas 50)`);
      exceptionsResult.rows.forEach((row, idx) => {
        console.log(`\n  [${idx + 1}] ${row.date}`);
        console.log(`      ID: ${row.id}`);
        console.log(`      Restaurant: ${row.restaurant_id}`);
        console.log(`      Abierto: ${row.is_open ? 'SÍ' : 'NO'}`);
        console.log(`      Shifts guardados: ${row.shifts ? JSON.stringify(row.shifts, null, 2) : 'Ninguno'}`);
        console.log(`      Notas: ${row.notes || 'Sin notas'}`);
        console.log(`      Creado: ${row.created_at}`);
        console.log(`      Actualizado: ${row.updated_at}`);
      });
    }

    // 4. RESERVATIONS (Reservas)
    console.log('\n\n📝 ===== RESERVATIONS (RESERVAS) =====');
    const reservationsResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        date,
        time,
        guest_count,
        client_phone,
        client_name,
        status,
        table_id,
        created_at
      FROM reservations
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC, time DESC
      LIMIT 50
    `);
    
    if (reservationsResult.rows.length === 0) {
      console.log('❌ No hay reservas en los últimos 30 días');
    } else {
      console.log(`✅ Total: ${reservationsResult.rows.length} reservas (últimos 30 días, máx 50)`);
      reservationsResult.rows.forEach((row, idx) => {
        console.log(`\n  [${idx + 1}] ${row.date} - ${row.time}`);
        console.log(`      ID: ${row.id}`);
        console.log(`      Cliente: ${row.client_name} (${row.client_phone})`);
        console.log(`      Comensales: ${row.guest_count}`);
        console.log(`      Estado: ${row.status}`);
        console.log(`      Mesa: ${row.table_id || 'Sin asignar'}`);
        console.log(`      Creado: ${row.created_at}`);
      });
    }

    // 5. TABLES (Mesas)
    console.log('\n\n🪑 ===== TABLES (MESAS) =====');
    const tablesResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        table_number,
        capacity,
        location_id,
        is_active,
        created_at
      FROM tables
      ORDER BY table_number
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No hay mesas configuradas');
    } else {
      console.log(`✅ Total: ${tablesResult.rows.length} mesas`);
      tablesResult.rows.forEach((row, idx) => {
        console.log(`\n  [${idx + 1}] Mesa ${row.table_number}`);
        console.log(`      ID: ${row.id}`);
        console.log(`      Capacidad: ${row.capacity} personas`);
        console.log(`      Location ID: ${row.location_id || 'Sin ubicación'}`);
        console.log(`      Activa: ${row.is_active ? 'SÍ' : 'NO'}`);
        console.log(`      Creado: ${row.created_at}`);
      });
    }

    // 6. COMPARACIÓN: Excepciones con shifts vs sin shifts
    console.log('\n\n🔍 ===== ANÁLISIS: EXCEPCIONES CON/SIN TURNOS =====');
    const withShifts = await pool.query(`
      SELECT date, shifts, created_at, updated_at
      FROM day_exceptions
      WHERE shifts IS NOT NULL AND shifts != '[]'
      ORDER BY date DESC
      LIMIT 20
    `);
    
    const withoutShifts = await pool.query(`
      SELECT date, shifts, created_at, updated_at
      FROM day_exceptions
      WHERE shifts IS NULL OR shifts = '[]'
      ORDER BY date DESC
      LIMIT 20
    `);

    console.log(`\n✅ Excepciones CON turnos: ${withShifts.rows.length}`);
    withShifts.rows.forEach(row => {
      console.log(`   - ${row.date}: ${JSON.stringify(row.shifts)} (actualizado: ${row.updated_at})`);
    });

    console.log(`\n⚠️  Excepciones SIN turnos: ${withoutShifts.rows.length}`);
    withoutShifts.rows.forEach(row => {
      console.log(`   - ${row.date}: ${row.shifts === null ? 'NULL' : 'Array vacío'} (actualizado: ${row.updated_at})`);
    });

    // 7. VERIFICAR FORMATO DE TURNOS
    console.log('\n\n🔍 ===== ANÁLISIS: FORMATO DE TURNOS GUARDADOS =====');
    const shiftsAnalysis = await pool.query(`
      SELECT 
        date,
        shifts,
        pg_typeof(shifts) as shifts_type,
        jsonb_array_length(shifts) as shifts_count
      FROM day_exceptions
      WHERE shifts IS NOT NULL AND shifts != '[]'
      ORDER BY date DESC
      LIMIT 10
    `);

    if (shiftsAnalysis.rows.length > 0) {
      console.log(`\nAnálisis de ${shiftsAnalysis.rows.length} excepciones con turnos:`);
      shiftsAnalysis.rows.forEach(row => {
        console.log(`\n  📅 ${row.date}:`);
        console.log(`     Tipo: ${row.shifts_type}`);
        console.log(`     Cantidad: ${row.shifts_count} turnos`);
        console.log(`     Datos: ${JSON.stringify(row.shifts, null, 2)}`);
      });
    }

    console.log('\n\n✅ ========== FIN DEL DIAGNÓSTICO ==========\n');

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

diagnoseCompleteData();
