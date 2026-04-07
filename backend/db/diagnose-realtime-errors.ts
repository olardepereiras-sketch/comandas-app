import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseRealtimeErrors() {
  console.log('🔍 DIAGNÓSTICO EN TIEMPO REAL - ERRORES DEL SISTEMA');
  console.log('='.repeat(80));
  console.log('');

  console.log('📋 1. VERIFICANDO ESTRUCTURA DE LA TABLA RESTAURANTS');
  console.log('-'.repeat(80));
  const restaurantsColumns = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'restaurants'
    ORDER BY ordinal_position
  `);
  
  console.log('\n✅ Columnas en tabla restaurants:');
  restaurantsColumns.rows.forEach(col => {
    console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
  });

  const hasMinBooking = restaurantsColumns.rows.find(r => r.column_name === 'min_booking_advance_minutes');
  const hasAutoSend = restaurantsColumns.rows.find(r => r.column_name === 'auto_send_whatsapp');
  const hasTableRotation = restaurantsColumns.rows.find(r => r.column_name === 'table_rotation_time');

  console.log('\n📊 Columnas críticas:');
  console.log(`   ${hasMinBooking ? '✅' : '❌'} min_booking_advance_minutes`);
  console.log(`   ${hasAutoSend ? '✅' : '❌'} auto_send_whatsapp`);
  console.log(`   ${hasTableRotation ? '✅' : '❌'} table_rotation_time`);

  console.log('\n📋 2. VERIFICANDO DATOS ACTUALES DEL RESTAURANTE');
  console.log('-'.repeat(80));
  const restaurants = await pool.query(`
    SELECT id, name, slug, 
           table_rotation_time, 
           min_booking_advance_minutes, 
           auto_send_whatsapp,
           advance_booking_days,
           notification_phones,
           notification_email,
           whatsapp_custom_message
    FROM restaurants
  `);

  restaurants.rows.forEach(r => {
    console.log(`\n🏢 ${r.name} (${r.slug})`);
    console.log(`   ID: ${r.id}`);
    console.log(`   Tiempo Rotación: ${r.table_rotation_time} minutos`);
    console.log(`   Tiempo Mín. Anticipación: ${r.min_booking_advance_minutes} minutos`);
    console.log(`   Auto WhatsApp: ${r.auto_send_whatsapp === true ? '✅ ACTIVADO' : '❌ DESACTIVADO'} (valor: ${r.auto_send_whatsapp})`);
    console.log(`   Días anticipación: ${r.advance_booking_days}`);
    console.log(`   Teléfonos notif: ${r.notification_phones}`);
    console.log(`   Email notif: ${r.notification_email || 'no configurado'}`);
    console.log(`   Mensaje WhatsApp: ${r.whatsapp_custom_message ? 'configurado' : 'no configurado'}`);
  });

  console.log('\n📋 3. VERIFICANDO ESTRUCTURA DE DAY_EXCEPTIONS');
  console.log('-'.repeat(80));
  const exceptionsColumns = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'day_exceptions'
    ORDER BY ordinal_position
  `);
  
  console.log('\n✅ Columnas en tabla day_exceptions:');
  exceptionsColumns.rows.forEach(col => {
    console.log(`   - ${col.column_name}: ${col.data_type}`);
  });

  const dateColumn = exceptionsColumns.rows.find(r => r.column_name === 'date');
  console.log(`\n📊 Tipo de columna 'date': ${dateColumn?.data_type}`);

  console.log('\n📋 4. PROBANDO ACTUALIZACIÓN DE RESTAURANTE');
  console.log('-'.repeat(80));
  
  if (restaurants.rows.length > 0) {
    const testRestaurant = restaurants.rows[0];
    console.log(`\n🧪 Probando UPDATE en restaurante: ${testRestaurant.name}`);
    
    try {
      const testValue = 45;
      const result = await pool.query(
        `UPDATE restaurants 
         SET min_booking_advance_minutes = $1, updated_at = $2 
         WHERE id = $3 
         RETURNING *`,
        [testValue, new Date(), testRestaurant.id]
      );
      
      console.log(`✅ UPDATE exitoso`);
      console.log(`   Valor guardado: ${result.rows[0].min_booking_advance_minutes}`);
      console.log(`   Auto WhatsApp: ${result.rows[0].auto_send_whatsapp}`);
      
      const verify = await pool.query(
        'SELECT min_booking_advance_minutes, auto_send_whatsapp FROM restaurants WHERE id = $1',
        [testRestaurant.id]
      );
      console.log(`✅ Verificación de lectura:`);
      console.log(`   min_booking_advance_minutes: ${verify.rows[0].min_booking_advance_minutes}`);
      console.log(`   auto_send_whatsapp: ${verify.rows[0].auto_send_whatsapp}`);
      
    } catch (error: any) {
      console.error(`❌ ERROR en UPDATE:`, error.message);
      console.error(`   Código: ${error.code}`);
      console.error(`   Detalle: ${error.detail}`);
    }
  }

  console.log('\n📋 5. ANALIZANDO PROBLEMA DE FECHAS');
  console.log('-'.repeat(80));
  
  const exceptions = await pool.query(`
    SELECT id, restaurant_id, date, is_open, template_ids
    FROM day_exceptions
    ORDER BY date
    LIMIT 5
  `);

  console.log(`\n📅 Primeras 5 excepciones de día:`);
  exceptions.rows.forEach(exc => {
    console.log(`\n   ID: ${exc.id}`);
    console.log(`   Fecha DB (raw): ${exc.date}`);
    console.log(`   Tipo: ${typeof exc.date}`);
    console.log(`   Constructor: ${exc.date?.constructor?.name || 'unknown'}`);
    
    if (exc.date instanceof Date) {
      console.log(`   ✅ Es un objeto Date`);
      console.log(`      ISO: ${exc.date.toISOString()}`);
      console.log(`      toString: ${exc.date.toString()}`);
    } else if (typeof exc.date === 'string') {
      console.log(`   ⚠️ Es un string: "${exc.date}"`);
      if (exc.date.includes('GMT') || exc.date.includes('(')) {
        console.log(`   ❌ PROBLEMA: fecha guardada como toString() en lugar de formato DATE`);
      }
    }
    console.log(`   Estado: ${exc.is_open ? 'ABIERTO' : 'CERRADO'}`);
  });

  console.log('\n✅ Diagnóstico completado');
  await pool.end();
  process.exit(0);
}

diagnoseRealtimeErrors().catch(async (error) => {
  console.error('❌ Error en diagnóstico:', error);
  await pool.end();
  process.exit(1);
});
