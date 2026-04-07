import { Pool } from 'pg';

const testDate = '2026-01-08';

async function diagnoseDateOffset() {
  console.log('\n🔍 DIAGNÓSTICO DE DESFASE DE FECHAS');
  console.log('='.repeat(80));
  
  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('\n1️⃣ PRUEBA DE GUARDADO');
    console.log('-'.repeat(80));
    
    const testId = 'test-date-offset-' + Date.now();
    const testRestaurantId = 'rest-1766786871175-ko9fxf2eu';
    
    console.log('📅 Fecha a guardar:', testDate);
    console.log('🔢 Tipo:', typeof testDate);
    
    // Insertar con fecha string
    await client.query(
      `INSERT INTO day_exceptions (id, restaurant_id, date, is_open, template_ids, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [testId, testRestaurantId, testDate, true, '[]']
    );
    console.log('✅ Registro insertado');
    
    console.log('\n2️⃣ PRUEBA DE LECTURA');
    console.log('-'.repeat(80));
    
    const result = await client.query(
      'SELECT * FROM day_exceptions WHERE id = $1',
      [testId]
    );
    
    const row = result.rows[0];
    console.log('\n📦 Datos leídos de DB:');
    console.log('   Raw date value:', row.date);
    console.log('   Type:', typeof row.date);
    console.log('   Constructor:', row.date?.constructor?.name);
    
    if (row.date instanceof Date) {
      console.log('\n📅 Es un objeto Date:');
      console.log('   toISOString():', row.date.toISOString());
      console.log('   toString():', row.date.toString());
      console.log('   getFullYear():', row.date.getFullYear());
      console.log('   getMonth():', row.date.getMonth());
      console.log('   getDate():', row.date.getDate());
      console.log('   getUTCFullYear():', row.date.getUTCFullYear());
      console.log('   getUTCMonth():', row.date.getUTCMonth());
      console.log('   getUTCDate():', row.date.getUTCDate());
      
      // Conversión LOCAL
      const localYear = row.date.getFullYear();
      const localMonth = String(row.date.getMonth() + 1).padStart(2, '0');
      const localDay = String(row.date.getDate()).padStart(2, '0');
      const localConverted = `${localYear}-${localMonth}-${localDay}`;
      console.log('\n   🔄 Conversión LOCAL:', localConverted);
      console.log('   ❓ ¿Coincide con original?', localConverted === testDate ? '✅ SÍ' : '❌ NO');
      
      // Conversión UTC
      const utcYear = row.date.getUTCFullYear();
      const utcMonth = String(row.date.getUTCMonth() + 1).padStart(2, '0');
      const utcDay = String(row.date.getUTCDate()).padStart(2, '0');
      const utcConverted = `${utcYear}-${utcMonth}-${utcDay}`;
      console.log('\n   🔄 Conversión UTC:', utcConverted);
      console.log('   ❓ ¿Coincide con original?', utcConverted === testDate ? '✅ SÍ' : '❌ NO');
    }
    
    console.log('\n3️⃣ PRUEBA DE COMPARACIÓN');
    console.log('-'.repeat(80));
    
    const searchResult = await client.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 AND date = $2',
      [testRestaurantId, testDate]
    );
    
    console.log('\n🔍 Búsqueda con fecha:', testDate);
    console.log('   Registros encontrados:', searchResult.rows.length);
    if (searchResult.rows.length > 0) {
      console.log('   ✅ La búsqueda funciona correctamente');
    } else {
      console.log('   ❌ La búsqueda NO encuentra el registro');
    }
    
    // Limpiar
    await client.query('DELETE FROM day_exceptions WHERE id = $1', [testId]);
    console.log('\n🧹 Registro de prueba eliminado');
    
    console.log('\n4️⃣ ANÁLISIS DE REGISTROS EXISTENTES');
    console.log('-'.repeat(80));
    
    const existing = await client.query(
      'SELECT id, date, is_open FROM day_exceptions WHERE restaurant_id = $1 ORDER BY date LIMIT 5',
      [testRestaurantId]
    );
    
    console.log('\n📋 Primeros 5 registros:');
    for (const ex of existing.rows) {
      console.log('\n   ID:', ex.id);
      console.log('   Date (raw):', ex.date);
      console.log('   Date (type):', typeof ex.date);
      console.log('   Date (constructor):', ex.date?.constructor?.name);
      console.log('   Is Open:', ex.is_open);
      
      if (ex.date instanceof Date) {
        const localConverted = `${ex.date.getFullYear()}-${String(ex.date.getMonth() + 1).padStart(2, '0')}-${String(ex.date.getDate()).padStart(2, '0')}`;
        const utcConverted = `${ex.date.getUTCFullYear()}-${String(ex.date.getUTCMonth() + 1).padStart(2, '0')}-${String(ex.date.getUTCDate()).padStart(2, '0')}`;
        console.log('   LOCAL converted:', localConverted);
        console.log('   UTC converted:', utcConverted);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnóstico completado\n');
}

diagnoseDateOffset().catch(console.error);
