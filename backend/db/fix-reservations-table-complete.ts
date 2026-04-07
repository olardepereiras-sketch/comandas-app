import { Pool } from 'pg';

console.log('🔧 Reparando tabla reservations completamente...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixReservationsTable() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando columnas existentes...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas actuales:', columnsResult.rows.map(r => r.column_name).join(', '));

    console.log('📋 Agregando columnas faltantes...');
    
    const alterations = [
      { name: 'client_phone', type: 'TEXT', description: 'Teléfono del cliente' },
      { name: 'client_name', type: 'TEXT', description: 'Nombre del cliente' },
      { name: 'client_email', type: 'TEXT', description: 'Email del cliente' },
      { name: 'location_name', type: 'TEXT', description: 'Nombre de la ubicación' },
      { name: 'client_notes', type: 'TEXT', description: 'Notas del cliente' },
      { name: 'confirmation_token2', type: 'TEXT', description: 'Token alternativo' },
      { name: 'pending_expires_at', type: 'TIMESTAMP', description: 'Expiración de reserva pendiente' },
      { name: 'is_new_client', type: 'BOOLEAN DEFAULT false', description: 'Si es cliente nuevo' },
    ];

    for (const col of alterations) {
      try {
        await client.query(`
          ALTER TABLE reservations 
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✅ Columna ${col.name} agregada/verificada (${col.description})`);
      } catch (error: any) {
        if (error.code === '42701') {
          console.log(`⚠️  Columna ${col.name} ya existe`);
        } else {
          throw error;
        }
      }
    }

    console.log('📋 Creando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_pending_expires 
      ON reservations(pending_expires_at) 
      WHERE status = 'pending'
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_token2 
      ON reservations(confirmation_token2)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_status 
      ON reservations(status)
    `);
    
    console.log('✅ Índices creados exitosamente');

    console.log('📋 Verificando columnas finales...');
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Total de columnas:', finalResult.rows.length);
    console.log('📋 Columnas críticas verificadas:');
    const criticalColumns = ['pending_expires_at', 'is_new_client', 'client_phone', 'client_name', 'confirmation_token2'];
    for (const colName of criticalColumns) {
      const col = finalResult.rows.find(r => r.column_name === colName);
      if (col) {
        console.log(`   ✅ ${colName}: ${col.data_type}`);
      } else {
        console.log(`   ❌ ${colName}: NO EXISTE`);
      }
    }

    console.log('✅ Reparación completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixReservationsTable()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
