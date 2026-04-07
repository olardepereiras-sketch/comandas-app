import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyAndFixSchema() {
  console.log('🔍 VERIFICANDO Y CORRIGIENDO ESQUEMA DE BASE DE DATOS');
  console.log('='.repeat(80));

  try {
    console.log('\n1️⃣ Verificando columnas en tabla restaurants...');
    
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name IN ('min_booking_advance_minutes', 'auto_send_whatsapp', 'table_rotation_time')
    `);

    const existingColumns = columnsCheck.rows.map(r => r.column_name);
    console.log('✅ Columnas existentes:', existingColumns);

    const neededColumns = [
      { name: 'min_booking_advance_minutes', type: 'INTEGER', default: '0' },
      { name: 'auto_send_whatsapp', type: 'BOOLEAN', default: 'false' },
      { name: 'table_rotation_time', type: 'INTEGER', default: '100' },
    ];

    for (const col of neededColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`\n⚠️ Falta columna ${col.name}, agregando...`);
        await pool.query(
          `ALTER TABLE restaurants ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`
        );
        console.log(`✅ Columna ${col.name} agregada`);
      } else {
        console.log(`✅ Columna ${col.name} existe`);
      }
    }

    console.log('\n2️⃣ Verificando tipo de dato de columna date en day_exceptions...');
    const dateTypeCheck = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions' 
      AND column_name = 'date'
    `);

    if (dateTypeCheck.rows.length > 0) {
      const dataType = dateTypeCheck.rows[0].data_type;
      console.log(`✅ Tipo de dato de 'date': ${dataType}`);
      
      if (dataType === 'date') {
        console.log('✅ El tipo de dato es correcto (DATE)');
      } else if (dataType === 'timestamp without time zone' || dataType === 'timestamp with time zone') {
        console.log('⚠️ El tipo de dato es TIMESTAMP, debería ser DATE');
        console.log('   Esto puede causar problemas de zona horaria');
      } else if (dataType === 'text' || dataType === 'character varying') {
        console.log('❌ El tipo de dato es TEXT/VARCHAR, esto es incorrecto');
        console.log('   Se recomienda cambiar a DATE');
      }
    }

    console.log('\n3️⃣ Limpiando registros con fechas mal formateadas...');
    const badDates = await pool.query(`
      SELECT id, date 
      FROM day_exceptions 
      WHERE date::text LIKE '%GMT%' OR date::text LIKE '%(%)%'
      LIMIT 5
    `);

    if (badDates.rows.length > 0) {
      console.log(`\n⚠️ Encontradas ${badDates.rows.length} fechas mal formateadas:`);
      badDates.rows.forEach(row => {
        console.log(`   - ID: ${row.id}, Fecha: ${row.date}`);
      });
      
      console.log('\n🔧 Limpiando fechas...');
      for (const row of badDates.rows) {
        const parsedDate = new Date(row.date);
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const cleanDate = `${year}-${month}-${day}`;
        
        await pool.query(
          'UPDATE day_exceptions SET date = $1 WHERE id = $2',
          [cleanDate, row.id]
        );
        console.log(`   ✅ ${row.id}: ${row.date} → ${cleanDate}`);
      }
    } else {
      console.log('✅ No se encontraron fechas mal formateadas');
    }

    console.log('\n4️⃣ Verificando datos actuales de restaurantes...');
    const restaurants = await pool.query(`
      SELECT id, name, 
             min_booking_advance_minutes, 
             auto_send_whatsapp, 
             table_rotation_time
      FROM restaurants
    `);

    restaurants.rows.forEach(r => {
      console.log(`\n🏢 ${r.name}:`);
      console.log(`   - min_booking_advance_minutes: ${r.min_booking_advance_minutes}`);
      console.log(`   - auto_send_whatsapp: ${r.auto_send_whatsapp}`);
      console.log(`   - table_rotation_time: ${r.table_rotation_time}`);
    });

    console.log('\n✅ Verificación y corrección completada');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

verifyAndFixSchema().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
