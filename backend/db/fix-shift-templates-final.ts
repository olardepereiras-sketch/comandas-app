import { Pool } from 'pg';

console.log('🔧 ARREGLANDO TABLA SHIFT_TEMPLATES...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixShiftTemplates() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📋 Verificando columnas de shift_templates...');
    const columnsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shift_templates'
    `);
    
    const columns = columnsCheck.rows.map(r => r.column_name);
    console.log('   Columnas actuales:', columns.join(', '));
    
    if (columns.includes('time_slots') && !columns.includes('times')) {
      console.log('   ➕ Renombrando time_slots a times...');
      await client.query(`
        ALTER TABLE shift_templates 
        RENAME COLUMN time_slots TO times
      `);
      console.log('   ✅ Columna renombrada\n');
    } else if (columns.includes('times')) {
      console.log('   ✅ Columna times ya existe\n');
    } else {
      console.log('   ➕ Agregando columna times...');
      await client.query(`
        ALTER TABLE shift_templates 
        ADD COLUMN times TEXT NOT NULL DEFAULT '[]'
      `);
      
      if (columns.includes('time_slots')) {
        console.log('   📋 Copiando datos de time_slots a times...');
        await client.query(`
          UPDATE shift_templates 
          SET times = time_slots
        `);
        
        console.log('   🗑️ Eliminando columna time_slots...');
        await client.query(`
          ALTER TABLE shift_templates 
          DROP COLUMN time_slots
        `);
      }
      console.log('   ✅ Columna times creada\n');
    }

    console.log('📋 Eliminando columnas innecesarias...');
    const columnsToRemove = ['max_guests_per_hour', 'min_rating', 'min_local_rating'];
    
    for (const col of columnsToRemove) {
      if (columns.includes(col)) {
        console.log(`   🗑️ Eliminando columna ${col}...`);
        await client.query(`
          ALTER TABLE shift_templates 
          DROP COLUMN IF EXISTS ${col}
        `);
      }
    }
    console.log('   ✅ Columnas innecesarias eliminadas\n');

    console.log('📋 Verificando estructura final...');
    const finalCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shift_templates'
      ORDER BY ordinal_position
    `);
    
    console.log('   Estructura final:');
    finalCheck.rows.forEach(row => {
      console.log(`     - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Tabla shift_templates arreglada correctamente');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixShiftTemplates().catch(console.error);
