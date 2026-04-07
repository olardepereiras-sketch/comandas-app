import { Pool } from 'pg';

console.log('🚀 CONFIGURANDO BASE DE DATOS Y ESQUEMA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const DB_USER = 'reservamesa_user';
const DB_PASSWORD = 'MiContrasenaSegura666';
const DB_NAME = 'reservamesa_db';
const DB_HOST = 'localhost';
const DB_PORT = '5432';

async function setupDatabase() {
  console.log('📋 Paso 1: Verificando/Creando base de datos...');
  
  const adminPool = new Pool({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: parseInt(DB_PORT),
    database: 'postgres',
  });

  try {
    const adminClient = await adminPool.connect();
    
    try {
      const dbCheck = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [DB_NAME]
      );

      if (dbCheck.rows.length === 0) {
        console.log(`➕ Creando base de datos ${DB_NAME}...`);
        await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
        console.log('✅ Base de datos creada');
      } else {
        console.log(`✅ Base de datos ${DB_NAME} ya existe`);
      }
    } finally {
      adminClient.release();
    }
  } catch (error: any) {
    console.error('❌ Error configurando base de datos:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

async function fixDayExceptionsSchema() {
  console.log('\n📋 Paso 2: Arreglando esquema de day_exceptions...');
  
  const pool = new Pool({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: parseInt(DB_PORT),
    database: DB_NAME,
  });

  const client = await pool.connect();
  
  try {
    console.log('📋 Verificando si la tabla day_exceptions existe...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'day_exceptions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('➕ Creando tabla day_exceptions...');
      await client.query(`
        CREATE TABLE day_exceptions (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          date TEXT NOT NULL,
          is_open BOOLEAN NOT NULL DEFAULT false,
          template_ids TEXT,
          shifts JSONB,
          notes TEXT,
          special_day_message TEXT,
          special_message_enabled BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(restaurant_id, date)
        )
      `);
      console.log('✅ Tabla day_exceptions creada');
    } else {
      console.log('✅ Tabla day_exceptions existe');
      
      console.log('📋 Verificando columnas...');
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'day_exceptions'
      `);
      
      const existingColumns = columnsResult.rows.map(r => r.column_name);
      console.log('📋 Columnas actuales:', existingColumns.join(', '));

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
        console.log('✅ Columna template_ids añadida');
      }

      if (!existingColumns.includes('shifts')) {
        console.log('➕ Añadiendo columna shifts...');
        await client.query(`
          ALTER TABLE day_exceptions 
          ADD COLUMN shifts JSONB
        `);
        console.log('✅ Columna shifts añadida');
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

      if (existingColumns.includes('max_guests_per_shift')) {
        console.log('🗑️ Eliminando columna obsoleta max_guests_per_shift...');
        await client.query(`
          ALTER TABLE day_exceptions 
          DROP COLUMN IF EXISTS max_guests_per_shift
        `);
        console.log('✅ Columna eliminada');
      }
    }

    console.log('\n📋 Verificando esquema final...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Esquema final de day_exceptions:');
    finalColumns.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${row.column_name}: ${row.data_type} ${nullable}`);
    });

    console.log('\n✅ Esquema de day_exceptions arreglado exitosamente');
    
  } catch (error: any) {
    console.error('❌ Error arreglando esquema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    await setupDatabase();
    await fixDayExceptionsSchema();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Base de datos: ${DB_NAME}`);
    console.log(`👤 Usuario: ${DB_USER}`);
    console.log(`🔒 Contraseña: ${DB_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }
}

main();
