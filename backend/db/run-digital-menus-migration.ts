import { Pool } from 'pg';
import { addDigitalMenus } from './add-digital-menus';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    await addDigitalMenus(pool);
    console.log('✅ Migración de carta digital completada');
  } catch (err) {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
