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

async function fixAllCriticalColumns() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 ARREGLANDO TODAS LAS COLUMNAS CRÍTICAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Arreglar tabla CLIENTS
    console.log('📋 Paso 1: Verificando tabla CLIENTS...');
    const clientsColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    const clientsColumnNames = clientsColumns.rows.map((row: any) => row.column_name);

    if (!clientsColumnNames.includes('terms_accepted_at')) {
      console.log('  Añadiendo terms_accepted_at...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN terms_accepted_at TIMESTAMP
      `);
      console.log('  ✅ Columna terms_accepted_at añadida');
    } else {
      console.log('  ✅ Columna terms_accepted_at existe');
    }

    if (!clientsColumnNames.includes('whatsapp_notifications_accepted')) {
      console.log('  Añadiendo whatsapp_notifications_accepted...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN whatsapp_notifications_accepted BOOLEAN DEFAULT false
      `);
      console.log('  ✅ Columna whatsapp_notifications_accepted añadida');
    } else {
      console.log('  ✅ Columna whatsapp_notifications_accepted existe');
    }

    if (!clientsColumnNames.includes('data_storage_accepted')) {
      console.log('  Añadiendo data_storage_accepted...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN data_storage_accepted BOOLEAN DEFAULT false
      `);
      console.log('  ✅ Columna data_storage_accepted añadida');
    } else {
      console.log('  ✅ Columna data_storage_accepted existe');
    }

    if (!clientsColumnNames.includes('rating_accepted')) {
      console.log('  Añadiendo rating_accepted...');
      await client.query(`
        ALTER TABLE clients 
        ADD COLUMN rating_accepted BOOLEAN DEFAULT false
      `);
      console.log('  ✅ Columna rating_accepted añadida');
    } else {
      console.log('  ✅ Columna rating_accepted existe');
    }

    console.log('✅ Tabla clients actualizada\n');

    // 2. Arreglar tabla WHATSAPP_NOTIFICATIONS
    console.log('📋 Paso 2: Verificando tabla WHATSAPP_NOTIFICATIONS...');
    
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_notifications'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('  Tabla no existe, creándola completa...');
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
      console.log('  ✅ Tabla creada completamente');
    } else {
      const notifColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_notifications'
      `);
      const notifColumnNames = notifColumns.rows.map((row: any) => row.column_name);

      if (!notifColumnNames.includes('updated_at')) {
        console.log('  Añadiendo updated_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);
        console.log('  ✅ Columna updated_at añadida');
      } else {
        console.log('  ✅ Columna updated_at existe');
      }

      if (!notifColumnNames.includes('last_attempt_at')) {
        console.log('  Añadiendo last_attempt_at...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN last_attempt_at TIMESTAMP
        `);
        console.log('  ✅ Columna last_attempt_at añadida');
      } else {
        console.log('  ✅ Columna last_attempt_at existe');
      }

      if (!notifColumnNames.includes('error_message')) {
        console.log('  Añadiendo error_message...');
        await client.query(`
          ALTER TABLE whatsapp_notifications 
          ADD COLUMN error_message TEXT
        `);
        console.log('  ✅ Columna error_message añadida');
      } else {
        console.log('  ✅ Columna error_message existe');
      }

      if (!notifColumnNames.includes('sent_at')) {
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

    console.log('✅ Tabla whatsapp_notifications actualizada\n');

    // 3. Verificar índices
    console.log('📋 Paso 3: Verificando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_scheduled 
      ON whatsapp_notifications(scheduled_for, status) 
      WHERE status = 'pending'
    `);
    console.log('  ✅ Índice para notificaciones pendientes verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_reservation 
      ON whatsapp_notifications(reservation_id, status)
    `);
    console.log('  ✅ Índice para búsqueda por reserva verificado');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TODAS LAS COLUMNAS CRÍTICAS ACTUALIZADAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificación final
    console.log('📊 Verificación final:\n');
    
    const finalClients = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      AND column_name IN ('terms_accepted_at', 'whatsapp_notifications_accepted', 'data_storage_accepted', 'rating_accepted')
      ORDER BY column_name
    `);
    console.log('Columnas en clients:');
    finalClients.rows.forEach((col: any) => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });

    const finalNotif = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications' 
      AND column_name IN ('updated_at', 'last_attempt_at', 'error_message', 'sent_at')
      ORDER BY column_name
    `);
    console.log('\nColumnas en whatsapp_notifications:');
    finalNotif.rows.forEach((col: any) => {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('\n❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllCriticalColumns()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
