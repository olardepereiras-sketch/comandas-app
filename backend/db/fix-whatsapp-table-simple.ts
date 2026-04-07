import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), 'env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      process.env[key] = value;
    }
    
    console.log('✅ Variables de entorno cargadas');
  } catch (error) {
    console.error('❌ Error cargando env:', error);
    throw error;
  }
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL no configurada');
}

console.log('🔗 Conectando a PostgreSQL...');
console.log(`📍 URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: false,
});

async function fixTable() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL');

    console.log('\n📋 Verificando tabla whatsapp_notifications...');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tabla no existe, creándola...');
      
      await client.query(`
        CREATE TABLE whatsapp_notifications (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          reservation_id TEXT NOT NULL,
          recipient_phone TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL,
          scheduled_for TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TIMESTAMP,
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
        )
      `);
      
      console.log('✅ Tabla creada');
    } else {
      console.log('✅ Tabla existe');
      
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_notifications'
      `);
      
      const columns = columnsResult.rows.map((r: any) => r.column_name);
      console.log(`📊 Columnas actuales: ${columns.join(', ')}`);
      
      if (!columns.includes('updated_at')) {
        console.log('➕ Añadiendo columna updated_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);
        console.log('✅ Columna updated_at añadida');
      } else {
        console.log('✅ Columna updated_at ya existe');
      }
      
      if (!columns.includes('last_attempt_at')) {
        console.log('➕ Añadiendo columna last_attempt_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN last_attempt_at TIMESTAMP
        `);
        console.log('✅ Columna last_attempt_at añadida');
      }
      
      if (!columns.includes('error_message')) {
        console.log('➕ Añadiendo columna error_message...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN error_message TEXT
        `);
        console.log('✅ Columna error_message añadida');
      }
      
      if (!columns.includes('sent_at')) {
        console.log('➕ Añadiendo columna sent_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN sent_at TIMESTAMP
        `);
        console.log('✅ Columna sent_at añadida');
      }
    }
    
    console.log('\n📋 Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
      ON whatsapp_notifications(scheduled_for, status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
      ON whatsapp_notifications(reservation_id)
    `);
    console.log('✅ Índices creados');
    
    console.log('\n🎉 Tabla whatsapp_notifications lista');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

fixTable()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falló:', error);
    process.exit(1);
  });
