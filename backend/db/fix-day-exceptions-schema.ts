import { Pool } from 'pg';

console.log('🔧 Arreglando esquema de day_exceptions...');

const connectionString = process.env.DATABASE_URL || 'postgresql://reservamesa_user:MiContrasenaSegura666@localhost:5432/reservamesa';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando columnas existentes...');
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
    `);
    
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    console.log('📋 Columnas existentes:', existingColumns);

    if (existingColumns.includes('enabled_shift_ids') && !existingColumns.includes('template_ids')) {
      console.log('🔄 Renombrando enabled_shift_ids a template_ids...');
      await client.query(`
        ALTER TABLE day_exceptions 
        RENAME COLUMN enabled_shift_ids TO template_ids
      `);
      console.log('✅ Columna renombrada');
    } else if (!existingColumns.includes('template_ids')) {
      console.log('➕ Añadiendo columna template_ids...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN template_ids TEXT
      `);
      console.log('✅ Columna añadida');
    } else {
      console.log('✅ Columna template_ids ya existe');
    }

    if (existingColumns.includes('max_guests_per_shift')) {
      console.log('🗑️ Eliminando columna obsoleta max_guests_per_shift...');
      await client.query(`
        ALTER TABLE day_exceptions 
        DROP COLUMN IF EXISTS max_guests_per_shift
      `);
      console.log('✅ Columna eliminada');
    }

    if (!existingColumns.includes('notes')) {
      console.log('➕ Añadiendo columna notes...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN notes TEXT
      `);
      console.log('✅ Columna notes añadida');
    }

    if (!existingColumns.includes('special_day_message')) {
      console.log('➕ Añadiendo columna special_day_message...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN special_day_message TEXT
      `);
      console.log('✅ Columna special_day_message añadida');
    }

    if (!existingColumns.includes('special_message_enabled')) {
      console.log('➕ Añadiendo columna special_message_enabled...');
      await client.query(`
        ALTER TABLE day_exceptions 
        ADD COLUMN special_message_enabled BOOLEAN DEFAULT false
      `);
      console.log('✅ Columna special_message_enabled añadida');
    }

    console.log('📋 Verificando esquema final...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Esquema final de day_exceptions:');
    finalColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('✅ Esquema arreglado exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error arreglando esquema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
