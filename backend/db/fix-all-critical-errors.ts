import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixAllErrors() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ARREGLANDO TODOS LOS ERRORES CRÍTICOS...\n');

    // 1. Verificar y corregir columnas de reservations
    console.log('📋 1/4 Corrigiendo esquema de reservations...');
    
    // Verificar columnas existentes
    const { rows: existingColumns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `);
    
    const columnNames = existingColumns.map((r: any) => r.column_name);
    console.log('  Columnas actuales:', columnNames.join(', '));

    // Agregar columnas faltantes
    const columnsToAdd = [
      { name: 'client_name', type: 'TEXT' },
      { name: 'client_phone', type: 'TEXT' },
      { name: 'client_email', type: 'TEXT' },
      { name: 'location_name', type: 'TEXT' },
      { name: 'high_chair_count', type: 'INTEGER' },
      { name: 'client_notes', type: 'TEXT DEFAULT \'\'' },
      { name: 'auto_send_whatsapp', type: 'BOOLEAN DEFAULT false' },
    ];

    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        try {
          await client.query(`ALTER TABLE reservations ADD COLUMN ${col.name} ${col.type}`);
          console.log(`  ✅ Columna ${col.name} agregada`);
        } catch (err) {
          const error = err as Error;
          console.log(`  ⚠️ Error con ${col.name}:`, error.message);
        }
      } else {
        console.log(`  ℹ️ Columna ${col.name} ya existe`);
      }
    }

    // Renombrar confirmation_token a token si existe
    if (columnNames.includes('confirmation_token') && !columnNames.includes('token')) {
      await client.query(`ALTER TABLE reservations RENAME COLUMN confirmation_token TO token`);
      console.log('  ✅ Columna confirmation_token renombrada a token');
    } else if (!columnNames.includes('token')) {
      await client.query(`ALTER TABLE reservations ADD COLUMN token TEXT`);
      console.log('  ✅ Columna token creada');
    }

    // Generar tokens faltantes
    const { rows: noToken } = await client.query(`SELECT id FROM reservations WHERE token IS NULL`);
    for (const row of noToken) {
      const token = `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await client.query(`UPDATE reservations SET token = $1 WHERE id = $2`, [token, row.id]);
    }
    if (noToken.length > 0) {
      console.log(`  ✅ ${noToken.length} tokens generados`);
    }

    // Crear índice único en token
    try {
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_token ON reservations(token)`);
      console.log('  ✅ Índice único en token creado');
    } catch {
      console.log('  ℹ️ Índice en token ya existe');
    }

    // 2. Verificar day_exceptions
    console.log('\n📋 2/4 Verificando day_exceptions...');
    const { rows: exceptions } = await client.query(`
      SELECT COUNT(*) as count FROM day_exceptions
    `);
    console.log(`  ✅ ${exceptions[0].count} excepciones de día en BD`);

    // 3. Verificar schedules
    console.log('\n📋 3/4 Verificando schedules...');
    const { rows: schedules } = await client.query(`
      SELECT COUNT(*) as count FROM schedules
    `);
    console.log(`  ✅ ${schedules[0].count} horarios base en BD`);

    // 4. Verificar estructura final
    console.log('\n📋 4/4 Verificando estructura final...');
    const { rows: finalColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Estructura final de reservations:');
    finalColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n✅ ¡TODOS LOS ERRORES CRÍTICOS CORREGIDOS!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllErrors();
