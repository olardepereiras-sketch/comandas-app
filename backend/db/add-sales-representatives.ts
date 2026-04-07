import { Pool } from 'pg';

console.log('📊 AÑADIENDO SISTEMA DE COMERCIALES');
console.log('===================================\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addSalesRepresentatives() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conectado a PostgreSQL');

    console.log('\n📋 PASO 1: Creando tabla sales_representatives...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_representatives (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        new_client_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        first_renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        renewal_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla sales_representatives creada');

    console.log('\n📋 PASO 2: Añadiendo campo sales_rep_id a restaurants...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS sales_rep_id TEXT REFERENCES sales_representatives(id)
    `);
    console.log('✅ Campo sales_rep_id añadido');

    console.log('\n📋 PASO 3: Creando comercial por defecto "Página Web"...');
    const defaultSalesRepId = 'salesrep-website';
    const checkDefault = await client.query(
      'SELECT id FROM sales_representatives WHERE id = $1',
      [defaultSalesRepId]
    );

    if (checkDefault.rows.length === 0) {
      await client.query(`
        INSERT INTO sales_representatives (
          id, first_name, last_name, dni, address, phone, email,
          new_client_commission_percent, first_renewal_commission_percent, 
          renewal_commission_percent, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
        )
      `, [
        defaultSalesRepId,
        'Página',
        'Web',
        '00000000A',
        'Online',
        '+34000000000',
        'web@quieromesa.com',
        0,
        0,
        0,
        true
      ]);
      console.log('✅ Comercial "Página Web" creado');
    } else {
      console.log('✅ Comercial "Página Web" ya existe');
    }

    console.log('\n📋 PASO 4: Asignando comercial por defecto a restaurantes sin comercial...');
    const updateResult = await client.query(`
      UPDATE restaurants 
      SET sales_rep_id = $1 
      WHERE sales_rep_id IS NULL
    `, [defaultSalesRepId]);
    console.log(`✅ ${updateResult.rowCount} restaurantes actualizados con comercial por defecto`);

    console.log('\n✅ ¡Sistema de comerciales añadido exitosamente!');

  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSalesRepresentatives()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });
