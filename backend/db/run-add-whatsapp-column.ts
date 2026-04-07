import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔄 Agregando columna whatsapp_custom_message...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    const sqlPath = path.join(__dirname, 'add-whatsapp-custom-message.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await client.query(sql);
    
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
