import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function diagnoseDates() {
  console.log('🔍 DIAGNÓSTICO DE FECHAS - PROBLEMA DE DIFERENCIA DE 1 DÍA');
  console.log('='.repeat(80));
  console.log('');

  const restaurants = await pool.query('SELECT id, name, slug FROM restaurants');
  
  if (restaurants.rows.length === 0) {
    console.log('❌ No hay restaurantes en la base de datos');
    return;
  }

  for (const restaurant of restaurants.rows) {
    console.log(`\n📍 Restaurante: ${restaurant.name} (${restaurant.slug})`);
    console.log(`   ID: ${restaurant.id}`);
    console.log('-'.repeat(80));

    const exceptions = await pool.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 ORDER BY date',
      [restaurant.id]
    );

    if (exceptions.rows.length === 0) {
      console.log('   ⚠️  No hay excepciones de día para este restaurante');
      continue;
    }

    console.log(`\n   📅 EXCEPCIONES DE DÍA (${exceptions.rows.length} encontradas):`);
    console.log('   ' + '-'.repeat(76));

    for (const exc of exceptions.rows) {
      console.log('');
      console.log(`   🔹 ID: ${exc.id}`);
      console.log(`      📆 Fecha almacenada en DB: "${exc.date}"`);
      console.log(`      📆 Tipo de dato: ${typeof exc.date}`);
      
      let parsedDate: Date | null = null;
      let dateString = '';
      
      if (typeof exc.date === 'string') {
        if (exc.date.includes('T')) {
          parsedDate = new Date(exc.date);
          console.log(`      🔄 Formato: ISO 8601 con hora (${exc.date})`);
          console.log(`      📊 Parseado como Date: ${parsedDate.toISOString()}`);
          console.log(`      📊 UTC: ${parsedDate.getUTCFullYear()}-${String(parsedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(parsedDate.getUTCDate()).padStart(2, '0')}`);
          console.log(`      📊 Local: ${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`);
          
          dateString = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        } else {
          console.log(`      🔄 Formato: YYYY-MM-DD simple (${exc.date})`);
          dateString = exc.date;
          
          const [year, month, day] = exc.date.split('-').map(Number);
          parsedDate = new Date(year, month - 1, day);
          console.log(`      📊 Parseado como Date local: ${parsedDate.toISOString()}`);
        }
      }
      
      console.log(`      🎯 String de fecha calculado: "${dateString}"`);
      console.log(`      🔓 Estado: ${exc.is_open ? 'ABIERTO' : 'CERRADO'}`);
      
      if (exc.template_ids) {
        try {
          const templates = JSON.parse(exc.template_ids as string);
          console.log(`      🔄 Turnos: ${Array.isArray(templates) ? templates.length : 0}`);
        } catch (e) {
          console.log(`      ⚠️  Error parseando turnos: ${e}`);
        }
      }
      
      console.log('      ' + '·'.repeat(72));
    }

    console.log('\n   🔍 ANÁLISIS DE COMPARACIÓN DE FECHAS:');
    console.log('   ' + '-'.repeat(76));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 10; i++) {
      const testDate = new Date(today);
      testDate.setDate(today.getDate() + i);
      
      const testDateString = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
      
      const matchingExceptions = exceptions.rows.filter(exc => {
        let exDateString: string;
        if (typeof exc.date === 'string') {
          if (exc.date.includes('T')) {
            const exDate = new Date(exc.date);
            exDateString = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
          } else {
            exDateString = exc.date;
          }
        } else if (exc.date) {
          const exDate = new Date(exc.date as string | number);
          exDateString = `${exDate.getFullYear()}-${String(exDate.getMonth() + 1).padStart(2, '0')}-${String(exDate.getDate()).padStart(2, '0')}`;
        } else {
          exDateString = '';
        }
        return exDateString === testDateString;
      });
      
      if (matchingExceptions.length > 0) {
        console.log(`\n   📅 Fecha ${testDateString}:`);
        console.log(`      ✅ Se encontró ${matchingExceptions.length} excepción(es)`);
        matchingExceptions.forEach(exc => {
          console.log(`         - ID: ${exc.id}, Estado: ${exc.is_open ? 'ABIERTO' : 'CERRADO'}`);
        });
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔬 VERIFICACIÓN DE ZONA HORARIA DEL SISTEMA');
  console.log('='.repeat(80));
  
  const now = new Date();
  console.log(`Hora actual del sistema: ${now.toISOString()}`);
  console.log(`Hora local: ${now.toString()}`);
  console.log(`Timezone offset: ${now.getTimezoneOffset()} minutos`);
  console.log(`UTC: ${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`);
  console.log(`Local: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

  console.log('\n✅ Diagnóstico completado');
  await pool.end();
  process.exit(0);
}

diagnoseDates().catch(async (error) => {
  console.error('❌ Error en diagnóstico:', error);
  await pool.end();
  process.exit(1);
});
