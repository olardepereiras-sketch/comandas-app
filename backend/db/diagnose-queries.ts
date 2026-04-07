import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT,
});

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO: Verificando queries reales\n');
  console.log('='.repeat(60));

  try {
    const restaurantId = 'rest-1766786871175-ko9fxf2eu';

    console.log('\n📊 TEST 1: SELECT en restaurants (igual que list)');
    console.log('='.repeat(60));
    const restaurantQuery = `
      SELECT r.*, c.name as city_name, p.name as province_name
      FROM restaurants r
      LEFT JOIN cities c ON r.city_id = c.id
      LEFT JOIN provinces p ON r.province_id = p.id
      WHERE r.id = $1
    `;
    const r1 = await pool.query(restaurantQuery, [restaurantId]);
    if (r1.rows[0]) {
      console.log('✅ Restaurante encontrado:', r1.rows[0].name);
      console.log('   table_rotation_time:', r1.rows[0].table_rotation_time, '(tipo:', typeof r1.rows[0].table_rotation_time, ')');
      console.log('   advance_booking_days:', r1.rows[0].advance_booking_days);
      console.log('   Todas las columnas:', Object.keys(r1.rows[0]).join(', '));
    }

    console.log('\n📊 TEST 2: SELECT directo en restaurants');
    console.log('='.repeat(60));
    const r2 = await pool.query(
      'SELECT id, name, table_rotation_time, advance_booking_days FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    if (r2.rows[0]) {
      console.log('   table_rotation_time:', r2.rows[0].table_rotation_time);
      console.log('   advance_booking_days:', r2.rows[0].advance_booking_days);
    }

    console.log('\n📊 TEST 3: SELECT en day_exceptions');
    console.log('='.repeat(60));
    const r3 = await pool.query(
      'SELECT * FROM day_exceptions WHERE restaurant_id = $1 ORDER BY date LIMIT 5',
      [restaurantId]
    );
    console.log('Total excepciones:', r3.rows.length);
    r3.rows.forEach((row, i) => {
      console.log(`\n   Excepción ${i + 1}:`);
      console.log('   - ID:', row.id);
      console.log('   - Fecha:', row.date);
      console.log('   - isOpen:', row.is_open);
      console.log('   - template_ids tipo:', typeof row.template_ids);
      console.log('   - template_ids length:', row.template_ids?.length);
      console.log('   - template_ids raw:', row.template_ids);
      
      try {
        const parsed = JSON.parse(row.template_ids);
        console.log('   - template_ids parseado:', Array.isArray(parsed) ? parsed.length + ' items' : 'no es array');
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('   - Primer item:', JSON.stringify(parsed[0]));
        }
      } catch (e: any) {
        console.log('   - Error al parsear:', e.message);
      }
    });

    console.log('\n📊 TEST 4: UPDATE y SELECT inmediato de table_rotation_time');
    console.log('='.repeat(60));
    await pool.query(
      'UPDATE restaurants SET table_rotation_time = $1, updated_at = NOW() WHERE id = $2',
      [150, restaurantId]
    );
    console.log('✅ UPDATE ejecutado con valor 150');
    
    const r4 = await pool.query(
      'SELECT table_rotation_time FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    console.log('   SELECT inmediato:', r4.rows[0].table_rotation_time);

    await pool.query(
      'UPDATE restaurants SET table_rotation_time = $1, updated_at = NOW() WHERE id = $2',
      [120, restaurantId]
    );
    console.log('✅ Restaurado a 120');

    console.log('\n📊 TEST 5: Verificar schema de day_exceptions');
    console.log('='.repeat(60));
    const r5 = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    console.log('Columnas de day_exceptions:');
    r5.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} | Nullable: ${col.is_nullable}`);
    });

  } catch (error: any) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnose();
