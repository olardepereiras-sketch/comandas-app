import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile() {
  const envPath = path.join(process.cwd(), 'env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo env no encontrado en:', envPath);
    throw new Error('Archivo env no encontrado');
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        process.env[key.trim()] = value.trim();
      }
    }
  }
  
  console.log('✅ Variables de entorno cargadas desde archivo env');
  console.log('🔐 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 40) + '...');
}

loadEnvFile();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixAllCritical() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔐 Connection string:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 1. ARREGLANDO TABLA RESERVATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const reservationColumns = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'reservations'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Total de columnas:', reservationColumns.rows.length);
    
    const confirmationTokenCol = reservationColumns.rows.find(r => r.column_name === 'confirmation_token');
    if (confirmationTokenCol?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en confirmation_token...');
      await client.query(`ALTER TABLE reservations ALTER COLUMN confirmation_token DROP NOT NULL`);
      console.log('✅ confirmation_token ahora permite NULL');
    } else {
      console.log('✅ confirmation_token ya permite NULL');
    }
    
    const tokenCol = reservationColumns.rows.find(r => r.column_name === 'token');
    if (tokenCol?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en token...');
      await client.query(`ALTER TABLE reservations ALTER COLUMN token DROP NOT NULL`);
      console.log('✅ token ahora permite NULL');
    } else {
      console.log('✅ token ya permite NULL');
    }
    
    const clientEmailCol = reservationColumns.rows.find(r => r.column_name === 'client_email');
    if (clientEmailCol?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en client_email...');
      await client.query(`ALTER TABLE reservations ALTER COLUMN client_email DROP NOT NULL`);
      console.log('✅ client_email ahora permite NULL');
    }
    
    console.log('🔧 Eliminando constraints UNIQUE en confirmation_token...');
    const constraints = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'reservations' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%confirmation_token%'
    `);
    
    for (const constraint of constraints.rows) {
      console.log(`  Eliminando: ${constraint.constraint_name}`);
      await client.query(`ALTER TABLE reservations DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
    }
    console.log('✅ Constraints eliminados');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 2. ARREGLANDO TABLA CLIENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const clientColumns = await client.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    const clientCols = clientColumns.rows.map(r => r.column_name);
    console.log('📊 Columnas de clients:', clientCols.join(', '));
    
    if (!clientCols.includes('no_show')) {
      console.log('🔧 Agregando columna no_show...');
      await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS no_show INTEGER DEFAULT 0`);
      console.log('✅ Columna no_show agregada');
    }
    
    const emailCol = clientColumns.rows.find(r => r.column_name === 'email');
    if (emailCol?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en email...');
      await client.query(`ALTER TABLE clients ALTER COLUMN email DROP NOT NULL`);
      console.log('✅ email ahora permite NULL');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 3. ARREGLANDO TABLA ADMIN_USERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const adminTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'admin_users'
      )
    `);
    
    if (!adminTableCheck.rows[0].exists) {
      console.log('🔧 Creando tabla admin_users...');
      await client.query(`
        CREATE TABLE admin_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT 'admin@quieromesa.com',
          last_ip TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla admin_users creada');
    }
    
    const adminCheck = await client.query(`
      SELECT id, username FROM admin_users WHERE username IN ('tono', 'tono77')
    `);
    
    if (adminCheck.rows.length > 0) {
      console.log('📊 Usuario admin encontrado, actualizando...');
      await client.query(`
        UPDATE admin_users 
        SET username = 'tono77', password = '1500', email = 'admin@quieromesa.com', updated_at = NOW()
        WHERE username IN ('tono', 'tono77')
      `);
      console.log('✅ Credenciales actualizadas: tono77/1500');
    } else {
      console.log('🔧 Creando usuario admin...');
      await client.query(`
        INSERT INTO admin_users (id, username, password, email, created_at, updated_at)
        VALUES ('admin-tono77', 'tono77', '1500', 'admin@quieromesa.com', NOW(), NOW())
        ON CONFLICT (username) DO UPDATE SET password = '1500', updated_at = NOW()
      `);
      console.log('✅ Usuario admin creado: tono77/1500');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 4. ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const whatsappCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
    `);
    
    const whatsappColNames = whatsappCols.rows.map(r => r.column_name);
    
    if (whatsappColNames.includes('updated_at')) {
      console.log('🔧 Eliminando columna updated_at (causa conflictos)...');
      await client.query(`ALTER TABLE whatsapp_notifications DROP COLUMN IF EXISTS updated_at CASCADE`);
      console.log('✅ Columna updated_at eliminada');
    } else {
      console.log('✅ Tabla whatsapp_notifications OK');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 5. VERIFICANDO TOKENS DE RESERVAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const nullTokens = await client.query(`
      SELECT id, status FROM reservations
      WHERE (confirmation_token IS NULL OR confirmation_token = '') 
        AND status NOT IN ('cancelled', 'modified', 'no_show')
    `);
    
    console.log(`📊 Reservas sin token: ${nullTokens.rows.length}`);
    
    if (nullTokens.rows.length > 0) {
      console.log('🔧 Generando tokens...');
      for (const row of nullTokens.rows) {
        const newToken = `token-${Date.now()}-${row.id.substring(4, 12)}`;
        await client.query(`
          UPDATE reservations
          SET confirmation_token = $1, token = $1
          WHERE id = $2
        `, [newToken, row.id]);
      }
      console.log('✅ Tokens generados');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODOS LOS ARREGLOS COMPLETADOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllCritical()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });
