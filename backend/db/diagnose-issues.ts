import pkg from 'pg';
const { Client } = pkg;

async function diagnose() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 1: Estructura de day_exceptions');
    console.log('=' .repeat(60));
    
    const dayExceptionsStructure = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position;
    `);
    
    console.log('Columnas en day_exceptions:');
    dayExceptionsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} | Default: ${col.column_default || 'NULL'} | Nullable: ${col.is_nullable}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 2: Datos reales en day_exceptions');
    console.log('=' .repeat(60));
    
    const dayExceptions = await client.query(`
      SELECT 
        id,
        date,
        is_open,
        template_ids,
        LENGTH(template_ids::text) as template_ids_length,
        notes
      FROM day_exceptions
      ORDER BY date DESC
      LIMIT 5;
    `);
    
    console.log(`Total de excepciones: ${dayExceptions.rows.length}`);
    dayExceptions.rows.forEach(row => {
      console.log(`\n  Fecha: ${row.date}`);
      console.log(`  Abierto: ${row.is_open}`);
      console.log(`  Template IDs (length ${row.template_ids_length}):`);
      console.log(`    ${row.template_ids}`);
      
      try {
        const parsed = JSON.parse(row.template_ids);
        console.log(`  Template IDs parseado: ${parsed.length} shifts`);
        if (parsed.length > 0) {
          console.log(`    Primer shift:`, parsed[0]);
        }
      } catch (e: any) {
        console.log(`  ❌ Error al parsear template_ids: ${e.message}`);
      }
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 3: Estructura de restaurants');
    console.log('=' .repeat(60));
    
    const restaurantsStructure = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
        AND column_name IN ('id', 'name', 'table_rotation_time')
      ORDER BY ordinal_position;
    `);
    
    console.log('Columnas relevantes en restaurants:');
    restaurantsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} | Default: ${col.column_default || 'NULL'} | Nullable: ${col.is_nullable}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 4: Datos reales de table_rotation_time');
    console.log('=' .repeat(60));
    
    const restaurants = await client.query(`
      SELECT 
        id,
        name,
        table_rotation_time,
        pg_typeof(table_rotation_time) as tipo_real
      FROM restaurants
      LIMIT 5;
    `);
    
    restaurants.rows.forEach(row => {
      console.log(`  - ${row.name}: table_rotation_time = ${row.table_rotation_time} (tipo: ${row.tipo_real})`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 5: Probando UPDATE de table_rotation_time');
    console.log('=' .repeat(60));
    
    const testRestaurant = restaurants.rows[0];
    if (testRestaurant) {
      console.log(`\nProbando actualizar ${testRestaurant.name} con diferentes valores...`);
      
      // Test 1: Número directo
      try {
        await client.query('BEGIN');
        const result1 = await client.query(
          'UPDATE restaurants SET table_rotation_time = $1 WHERE id = $2',
          [120, testRestaurant.id]
        );
        await client.query('ROLLBACK');
        console.log(`  ✅ Test 1 (número 120): OK - ${result1.rowCount} filas`);
      } catch (e: any) {
        await client.query('ROLLBACK');
        console.log(`  ❌ Test 1 (número 120): FALLÓ - ${e.message}`);
      }

      // Test 2: String
      try {
        await client.query('BEGIN');
        const result2 = await client.query(
          'UPDATE restaurants SET table_rotation_time = $1 WHERE id = $2',
          ['120', testRestaurant.id]
        );
        await client.query('ROLLBACK');
        console.log(`  ✅ Test 2 (string "120"): OK - ${result2.rowCount} filas`);
      } catch (e: any) {
        await client.query('ROLLBACK');
        console.log(`  ❌ Test 2 (string "120"): FALLÓ - ${e.message}`);
      }

      // Test 3: NULL
      try {
        await client.query('BEGIN');
        const result3 = await client.query(
          'UPDATE restaurants SET table_rotation_time = $1 WHERE id = $2',
          [null, testRestaurant.id]
        );
        await client.query('ROLLBACK');
        console.log(`  ✅ Test 3 (null): OK - ${result3.rowCount} filas`);
      } catch (e: any) {
        await client.query('ROLLBACK');
        console.log(`  ❌ Test 3 (null): FALLÓ - ${e.message}`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 6: Schedules y shifts');
    console.log('=' .repeat(60));
    
    const schedules = await client.query(`
      SELECT 
        id,
        restaurant_id,
        day_of_week,
        is_open,
        template_ids
      FROM schedules
      LIMIT 3;
    `);
    
    console.log(`Total de schedules: ${schedules.rows.length}`);
    schedules.rows.forEach(row => {
      console.log(`\n  Día: ${row.day_of_week} | Abierto: ${row.is_open}`);
      console.log(`  Template IDs: ${row.template_ids}`);
      try {
        const parsed = JSON.parse(row.template_ids);
        console.log(`  Shifts: ${parsed.length}`);
        if (parsed.length > 0) {
          console.log(`    Ejemplo:`, parsed[0]);
        }
      } catch (e: any) {
        console.log(`  ❌ Error al parsear: ${e.message}`);
      }
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🔍 DIAGNÓSTICO 7: Shift Templates');
    console.log('=' .repeat(60));
    
    const shiftTemplates = await client.query(`
      SELECT 
        id,
        restaurant_id,
        name,
        times
      FROM shift_templates
      LIMIT 5;
    `);
    
    console.log(`Total de shift templates: ${shiftTemplates.rows.length}`);
    shiftTemplates.rows.forEach(row => {
      console.log(`\n  Template: ${row.name} (${row.id})`);
      console.log(`  Times: ${row.times}`);
      try {
        const parsed = JSON.parse(row.times);
        console.log(`  Times parseado: ${parsed.join(', ')}`);
      } catch (e: any) {
        console.log(`  ❌ Error al parsear times: ${e.message}`);
      }
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('=' .repeat(60));
    
  } catch (error: any) {
    console.error('❌ Error en diagnóstico:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

diagnose();
