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
    
    console.log('✅ Variables de entorno cargadas desde archivo env');
  } catch (error) {
    console.error('❌ Error cargando archivo env:', error);
    throw error;
  }
}

loadEnvFile();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixWhatsAppNotificationsTable() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔧 Verificando y arreglando tabla whatsapp_notifications...');

    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('📋 Tabla no existe, creándola completa...');
      
      await client.query(`
        CREATE TABLE whatsapp_notifications (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          reservation_id TEXT NOT NULL,
          recipient_phone TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          message TEXT NOT NULL,
          notification_type TEXT NOT NULL CHECK (notification_type IN ('immediate', 'reminder_24h', 'reminder_2h', 'reminder_30m')),
          scheduled_for TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
          attempts INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TIMESTAMP,
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
        )
      `);

      console.log('✅ Tabla creada completamente');
    } else {
      console.log('📋 Tabla existe, verificando columnas...');

      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'whatsapp_notifications'
        ORDER BY ordinal_position
      `);

      console.log('\n📊 Columnas actuales:');
      columns.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });

      const columnNames = columns.rows.map((row: any) => row.column_name);

      console.log('\n📋 Añadiendo columnas faltantes...');

      if (!columnNames.includes('updated_at')) {
        console.log('  Añadiendo updated_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);
        console.log('  ✅ Columna updated_at añadida');
      } else {
        console.log('  ✅ Columna updated_at existe');
      }

      if (!columnNames.includes('last_attempt_at')) {
        console.log('  Añadiendo last_attempt_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN last_attempt_at TIMESTAMP
        `);
        console.log('  ✅ Columna last_attempt_at añadida');
      } else {
        console.log('  ✅ Columna last_attempt_at existe');
      }

      if (!columnNames.includes('error_message')) {
        console.log('  Añadiendo error_message...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN error_message TEXT
        `);
        console.log('  ✅ Columna error_message añadida');
      } else {
        console.log('  ✅ Columna error_message existe');
      }

      if (!columnNames.includes('sent_at')) {
        console.log('  Añadiendo sent_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN sent_at TIMESTAMP
        `);
        console.log('  ✅ Columna sent_at añadida');
      } else {
        console.log('  ✅ Columna sent_at existe');
      }
    }

    console.log('\n📋 Verificando índices...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
      ON whatsapp_notifications(scheduled_for, status) 
      WHERE status = 'pending'
    `);
    console.log('✅ Índice para notificaciones pendientes verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
      ON whatsapp_notifications(reservation_id, status)
    `);
    console.log('✅ Índice para búsqueda por reserva verificado');

    console.log('\n📋 Verificando esquema final...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_notifications'
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Columnas finales en whatsapp_notifications:');
    finalColumns.rows.forEach((col: any) => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixWhatsAppNotificationsTable()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
