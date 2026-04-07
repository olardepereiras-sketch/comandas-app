import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function diagnoseDayExceptions() {
  console.log('🔍 DIAGNÓSTICO DE DAY EXCEPTIONS Y HORAS DISPONIBLES');
  console.log('=====================================================\n');

  try {
    console.log('📋 1. Verificando day_exceptions para O Lar de Pereiras...');
    const exceptionsResult = await pool.query(`
      SELECT 
        de.id,
        de.restaurant_id,
        de.date,
        de.is_open,
        de.template_ids,
        r.name as restaurant_name
      FROM day_exceptions de
      JOIN restaurants r ON r.id = de.restaurant_id
      WHERE de.restaurant_id = 'rest-1766786871175-ko9fxf2eu'
      ORDER BY de.date DESC
      LIMIT 10
    `);

    console.log(`Total excepciones: ${exceptionsResult.rows.length}\n`);
    
    exceptionsResult.rows.forEach((exc, idx) => {
      console.log(`Excepción #${idx + 1}:`);
      console.log(`  - ID: ${exc.id}`);
      console.log(`  - Fecha: ${exc.date}`);
      console.log(`  - Abierto: ${exc.is_open}`);
      console.log(`  - Template IDs tipo: ${typeof exc.template_ids}`);
      
      try {
        let parsed;
        if (typeof exc.template_ids === 'string') {
          parsed = JSON.parse(exc.template_ids);
        } else {
          parsed = exc.template_ids;
        }
        
        console.log(`  - Shifts parseados:`);
        if (Array.isArray(parsed)) {
          console.log(`    Array de ${parsed.length} elementos`);
          if (parsed.length > 0) {
            console.log(`    Primer elemento:`, JSON.stringify(parsed[0], null, 2));
          }
        } else {
          console.log(`    NO ES ARRAY:`, JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.log(`  - Error parseando: ${e}`);
        console.log(`  - Valor raw:`, exc.template_ids);
      }
      console.log('');
    });

    console.log('\n📋 2. Verificando schedules (horario semanal)...');
    const schedulesResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        day_of_week,
        is_open,
        shifts
      FROM schedules
      WHERE restaurant_id = 'rest-1766786871175-ko9fxf2eu'
      ORDER BY day_of_week
    `);

    console.log(`Total schedules: ${schedulesResult.rows.length}\n`);
    
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    schedulesResult.rows.forEach((sch) => {
      console.log(`${dayNames[sch.day_of_week]}:`);
      console.log(`  - Abierto: ${sch.is_open}`);
      try {
        const shifts = JSON.parse(sch.shifts || '[]');
        console.log(`  - Shifts: ${shifts.length}`);
        if (shifts.length > 0) {
          console.log(`  - Primer shift:`, JSON.stringify(shifts[0], null, 2));
        }
      } catch (e) {
        console.log(`  - Error parseando shifts`);
      }
      console.log('');
    });

    console.log('\n📋 3. Verificando shift templates...');
    const templatesResult = await pool.query(`
      SELECT 
        id,
        restaurant_id,
        name,
        times
      FROM shift_templates
      WHERE restaurant_id = 'rest-1766786871175-ko9fxf2eu'
    `);

    console.log(`Total templates: ${templatesResult.rows.length}\n`);
    templatesResult.rows.forEach((tmpl) => {
      console.log(`Template: ${tmpl.name}`);
      console.log(`  - ID: ${tmpl.id}`);
      console.log(`  - Times:`, JSON.parse(tmpl.times || '[]'));
      console.log('');
    });

    console.log('\n✅ DIAGNÓSTICO COMPLETADO\n');

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

diagnoseDayExceptions();
