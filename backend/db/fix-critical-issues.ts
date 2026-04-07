import { Pool } from 'pg';

console.log('🔧 Solucionando problemas críticos en la base de datos...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixCriticalIssues() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('📋 1. Verificando columna table_rotation_time en restaurants...');
    const checkColumn = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' AND column_name = 'table_rotation_time'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('   ⚠️  Columna no existe, creándola...');
      await client.query(`
        ALTER TABLE restaurants 
        ADD COLUMN table_rotation_time INTEGER DEFAULT 100
      `);
      console.log('   ✅ Columna table_rotation_time creada');
    } else {
      console.log('   ✅ Columna table_rotation_time ya existe:', checkColumn.rows[0]);
    }

    console.log('📋 2. Actualizando valores NULL a 100...');
    const updateResult = await client.query(`
      UPDATE restaurants 
      SET table_rotation_time = 100 
      WHERE table_rotation_time IS NULL
    `);
    console.log(`   ✅ ${updateResult.rowCount} registros actualizados`);

    console.log('📋 3. Verificando estructura de day_exceptions...');
    const checkDayExceptions = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    console.log('   Columnas en day_exceptions:');
    checkDayExceptions.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('📋 4. Verificando datos de day_exceptions...');
    const exceptions = await client.query(`
      SELECT id, date, is_open, template_ids 
      FROM day_exceptions 
      LIMIT 5
    `);
    console.log(`   Total de excepciones: ${exceptions.rows.length}`);
    exceptions.rows.forEach(row => {
      console.log(`   - ${row.date}: isOpen=${row.is_open}, shifts=${row.template_ids?.substring(0, 50) || 'null'}`);
    });

    console.log('🎉 Todos los problemas verificados y corregidos');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCriticalIssues();
