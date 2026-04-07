import { Client } from 'pg';

async function fixAllCritical() {
  console.log('🔧 ARREGLANDO TODOS LOS ERRORES CRÍTICOS...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    console.log('📋 1/3 Agregando columna rotation_time_minutes a tables...');
    try {
      await client.query(`
        ALTER TABLE tables 
        ADD COLUMN IF NOT EXISTS rotation_time_minutes INTEGER DEFAULT 120;
      `);
      
      await client.query(`
        UPDATE tables 
        SET rotation_time_minutes = 120 
        WHERE rotation_time_minutes IS NULL;
      `);
      
      console.log('✅ Columna rotation_time_minutes agregada y actualizada\n');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('⚠️ Columna rotation_time_minutes ya existe\n');
      } else {
        throw error;
      }
    }

    console.log('📋 2/3 Verificando estructura de reservations...');
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
    `);
    
    const columns = result.rows.map((row) => row.column_name);
    console.log('  Columnas actuales:', columns.join(', '));
    
    const requiredColumns = [
      { name: 'token', type: 'TEXT', nullable: 'NOT NULL' },
      { name: 'confirmation_token', type: 'TEXT', nullable: 'NOT NULL' },
      { name: 'client_name', type: 'TEXT', nullable: 'YES' },
      { name: 'client_phone', type: 'TEXT', nullable: 'YES' },
      { name: 'client_email', type: 'TEXT', nullable: 'YES' },
      { name: 'location_name', type: 'TEXT', nullable: 'YES' },
      { name: 'high_chair_count', type: 'INTEGER', nullable: 'YES' },
      { name: 'client_notes', type: 'TEXT', nullable: 'YES' },
      { name: 'auto_send_whatsapp', type: 'BOOLEAN', nullable: 'YES' },
    ];
    
    for (const col of requiredColumns) {
      if (!columns.includes(col.name)) {
        console.log(`  ✅ Agregando columna: ${col.name}`);
        const nullableClause = col.nullable === 'NOT NULL' ? 'NOT NULL DEFAULT \'\'' : '';
        await client.query(`
          ALTER TABLE reservations 
          ADD COLUMN ${col.name} ${col.type} ${nullableClause};
        `);
      }
    }
    
    console.log('✅ Estructura de reservations verificada\n');

    console.log('📋 3/3 Verificando índices...');
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_token 
        ON reservations(token);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token 
        ON reservations(confirmation_token);
      `);
      console.log('✅ Índices creados\n');
    } catch {
      console.log('⚠️ Índices ya existen\n');
    }

    console.log('✅ ¡TODOS LOS ERRORES CRÍTICOS CORREGIDOS!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixAllCritical().catch(console.error);
