import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
});

async function diagnoseRealtime() {
  console.log('\n🔍 DIAGNÓSTICO EN TIEMPO REAL');
  console.log('='.repeat(80));

  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';

    console.log('\n📊 1. CONFIGURACIÓN ACTUAL DEL RESTAURANTE');
    console.log('-'.repeat(80));
    const restaurantResult = await pool.query(
      'SELECT id, name, auto_send_whatsapp, min_booking_advance_minutes, table_rotation_time FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    
    if (restaurantResult.rows.length > 0) {
      const rest = restaurantResult.rows[0];
      console.log(`✅ Restaurante: ${rest.name}`);
      console.log(`   - auto_send_whatsapp: ${rest.auto_send_whatsapp} (tipo: ${typeof rest.auto_send_whatsapp})`);
      console.log(`   - min_booking_advance_minutes: ${rest.min_booking_advance_minutes} (tipo: ${typeof rest.min_booking_advance_minutes})`);
      console.log(`   - table_rotation_time: ${rest.table_rotation_time} (tipo: ${typeof rest.table_rotation_time})`);
    } else {
      console.log('❌ Restaurante no encontrado');
    }

    console.log('\n📅 2. EXCEPCIONES DE DÍA');
    console.log('-'.repeat(80));
    const exceptionsResult = await pool.query(
      `SELECT id, date, is_open, template_ids, 
              CASE 
                WHEN date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN date::text
                ELSE to_char(date::timestamp, 'YYYY-MM-DD')
              END as formatted_date
       FROM day_exceptions 
       WHERE restaurant_id = $1 
       ORDER BY date`,
      [restaurantId]
    );

    console.log(`Total de excepciones: ${exceptionsResult.rows.length}`);
    exceptionsResult.rows.forEach((ex: any, index: number) => {
      console.log(`\n   ${index + 1}. Excepción ID: ${ex.id}`);
      console.log(`      - Fecha almacenada: "${ex.date}" (tipo: ${typeof ex.date})`);
      console.log(`      - Fecha formateada: "${ex.formatted_date}"`);
      console.log(`      - isOpen: ${ex.is_open}`);
      
      let shifts = [];
      try {
        shifts = JSON.parse(ex.template_ids || '[]');
      } catch {
        console.log(`      - ⚠️ Error parseando template_ids`);
      }
      console.log(`      - Turnos configurados: ${shifts.length}`);
      if (shifts.length > 0) {
        shifts.forEach((shift: any, i: number) => {
          console.log(`         ${i + 1}. Hora: ${shift.startTime}, Comensales: ${shift.maxGuestsPerHour}, Min Rating: ${shift.minRating}`);
        });
      }
    });

    console.log('\n🔬 3. PRUEBA DE INSERCIÓN/ACTUALIZACIÓN');
    console.log('-'.repeat(80));
    
    const testDate = '2026-01-10';
    console.log(`Intentando crear/actualizar excepción para: ${testDate}`);
    
    const existingTest = await pool.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
      [restaurantId, testDate]
    );

    if (existingTest.rows.length > 0) {
      console.log(`✅ Excepción existente encontrada para ${testDate}`);
      console.log(`   ID: ${existingTest.rows[0].id}`);
    } else {
      console.log(`ℹ️  No existe excepción para ${testDate}`);
    }

    console.log('\n📋 4. ESQUEMA DE LA TABLA restaurants');
    console.log('-'.repeat(80));
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'restaurants'
      AND column_name IN ('auto_send_whatsapp', 'min_booking_advance_minutes', 'table_rotation_time')
      ORDER BY ordinal_position
    `);
    
    schemaResult.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });

    console.log('\n📋 5. ESQUEMA DE LA TABLA day_exceptions');
    console.log('-'.repeat(80));
    const exceptionsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    
    exceptionsSchema.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error: any) {
    console.error('\n❌ ERROR EN DIAGNÓSTICO:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnóstico completado\n');
}

diagnoseRealtime();
