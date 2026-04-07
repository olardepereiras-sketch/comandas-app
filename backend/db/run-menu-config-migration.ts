import { Pool } from 'pg';
import { addMenuConfigColumns } from './add-menu-config-columns';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    await addMenuConfigColumns(pool);
    console.log('✅ Migración de configuración de carta digital completada');
  } catch (err) {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
