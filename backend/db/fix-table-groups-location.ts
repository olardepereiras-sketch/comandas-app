import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Conectando a PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixTableGroupsLocation() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Verificando tabla table_groups...');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'table_groups'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📦 Creando tabla table_groups...');
      await client.query(`
        CREATE TABLE table_groups (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          location_id TEXT NOT NULL,
          table_ids TEXT[] NOT NULL,
          min_capacity INTEGER NOT NULL,
          max_capacity INTEGER NOT NULL,
          priority INTEGER DEFAULT 5,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla table_groups creada');
    } else {
      console.log('✅ Tabla table_groups existe');
      
      console.log('🔧 Verificando columna location_id...');
      const columnCheck = await client.query(`
        SELECT column_name, is_nullable, data_type
        FROM information_schema.columns
        WHERE table_name = 'table_groups' AND column_name = 'location_id'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('📦 Añadiendo columna location_id (nullable)...');
        await client.query(`ALTER TABLE table_groups ADD COLUMN location_id TEXT`);
        console.log('✅ Columna location_id añadida como nullable');
        
        console.log('🔧 Actualizando grupos existentes con location_id...');
        const groupsWithoutLocation = await client.query(`
          SELECT tg.id, tg.table_ids[1] as first_table_id
          FROM table_groups tg
          WHERE tg.location_id IS NULL
        `);
        
        for (const group of groupsWithoutLocation.rows) {
          const tableLocation = await client.query(`
            SELECT location_id FROM tables WHERE id = $1
          `, [group.first_table_id]);
          
          if (tableLocation.rows.length > 0) {
            await client.query(`
              UPDATE table_groups 
              SET location_id = $1 
              WHERE id = $2
            `, [tableLocation.rows[0].location_id, group.id]);
            console.log(`  ✓ Grupo ${group.id} actualizado con location_id: ${tableLocation.rows[0].location_id}`);
          } else {
            console.log(`  ⚠️ No se encontró ubicación para el grupo ${group.id}, eliminando...`);
            await client.query(`DELETE FROM table_groups WHERE id = $1`, [group.id]);
          }
        }
        
        console.log('🔧 Haciendo location_id NOT NULL...');
        await client.query(`ALTER TABLE table_groups ALTER COLUMN location_id SET NOT NULL`);
        console.log('✅ Columna location_id ahora es NOT NULL');
      } else if (columnCheck.rows[0].is_nullable === 'YES') {
        console.log('🔧 Actualizando grupos existentes sin location_id...');
        const groupsWithoutLocation = await client.query(`
          SELECT tg.id, tg.table_ids[1] as first_table_id
          FROM table_groups tg
          WHERE tg.location_id IS NULL
        `);
        
        for (const group of groupsWithoutLocation.rows) {
          const tableLocation = await client.query(`
            SELECT location_id FROM tables WHERE id = $1
          `, [group.first_table_id]);
          
          if (tableLocation.rows.length > 0) {
            await client.query(`
              UPDATE table_groups 
              SET location_id = $1 
              WHERE id = $2
            `, [tableLocation.rows[0].location_id, group.id]);
            console.log(`  ✓ Grupo ${group.id} actualizado con location_id`);
          }
        }
        
        console.log('🔧 Haciendo location_id NOT NULL...');
        await client.query(`ALTER TABLE table_groups ALTER COLUMN location_id SET NOT NULL`);
        console.log('✅ Columna location_id ahora es NOT NULL');
      } else {
        console.log('✅ Columna location_id ya es NOT NULL');
      }
    }
    
    console.log('🔧 Verificando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_table_groups_restaurant 
      ON table_groups(restaurant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_table_groups_location 
      ON table_groups(location_id)
    `);
    console.log('✅ Índices verificados');
    
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTableGroupsLocation().catch(console.error);
