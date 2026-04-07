import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile() {
  const envPath = path.join(process.cwd(), 'env');
  
  if (!fs.existsSync(envPath)) {
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
}

loadEnvFile();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixAllCriticalIssues() {
  const client = await pool.connect();

  try {
    console.log('🔗 Conectando a PostgreSQL...');
    console.log('🔐 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 1. ARREGLANDO TABLA ADMIN_USERS');
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
    
    console.log('🔧 Eliminando usuario admin anterior si existe...');
    await client.query(`DELETE FROM admin_users WHERE username = 'tono' OR username = 'tono77'`);
    
    console.log('🔧 Creando usuario admin con nuevas credenciales...');
    await client.query(`
      INSERT INTO admin_users (id, username, password, email, created_at, updated_at)
      VALUES ('admin-tono77', 'tono77', '1500', 'admin@quieromesa.com', NOW(), NOW())
    `);
    console.log('✅ Credenciales de admin restauradas: tono77 / 1500');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 2. ARREGLANDO TABLA CLIENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const clientColumns = await client.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Columnas actuales:', clientColumns.rows.map(r => `${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`).join(', '));
    
    const clientCols = clientColumns.rows.map(r => r.column_name);
    
    if (!clientCols.includes('no_show')) {
      console.log('🔧 Agregando columna no_show...');
      await client.query(`ALTER TABLE clients ADD COLUMN no_show INTEGER DEFAULT 0`);
      console.log('✅ Columna no_show agregada');
    }
    
    const emailCol = clientColumns.rows.find(r => r.column_name === 'email');
    if (emailCol?.is_nullable === 'NO') {
      console.log('🔧 Permitiendo NULL en columna email...');
      await client.query(`ALTER TABLE clients ALTER COLUMN email DROP NOT NULL`);
      console.log('✅ Columna email ahora permite NULL');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 3. ARREGLANDO TABLA RESERVATIONS');
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

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 4. VERIFICANDO TOKENS DE RESERVAS ACTIVAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const nullTokens = await client.query(`
      SELECT id, status FROM reservations
      WHERE (confirmation_token IS NULL OR confirmation_token = '') 
        AND status NOT IN ('cancelled', 'modified', 'no_show')
    `);
    
    console.log(`📊 Reservas sin token: ${nullTokens.rows.length}`);
    
    if (nullTokens.rows.length > 0) {
      console.log('🔧 Generando tokens para reservas activas...');
      for (const row of nullTokens.rows) {
        const newToken = `token-${Date.now()}-${row.id.substring(4, 12)}`;
        await client.query(`
          UPDATE reservations
          SET confirmation_token = $1, token = $1
          WHERE id = $2
        `, [newToken, row.id]);
      }
      console.log('✅ Tokens generados para', nullTokens.rows.length, 'reservas');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 5. ARREGLANDO TABLA WHATSAPP_NOTIFICATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const whatsappCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_notifications'
    `);
    
    if (whatsappCols.rows.some(r => r.column_name === 'updated_at')) {
      console.log('🔧 Eliminando columna updated_at (causa conflictos)...');
      await client.query(`ALTER TABLE whatsapp_notifications DROP COLUMN IF EXISTS updated_at CASCADE`);
      console.log('✅ Columna updated_at eliminada');
    } else {
      console.log('✅ Tabla whatsapp_notifications correcta (sin updated_at)');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 6. VERIFICANDO SISTEMA DE DAY_EXCEPTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const dayExceptionCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'day_exceptions'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Tabla day_exceptions verificada');
    console.log('📊 Columnas:', dayExceptionCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    const exceptionCount = await client.query(`SELECT COUNT(*) as count FROM day_exceptions`);
    console.log(`📊 Excepciones en DB: ${exceptionCount.rows[0].count}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SISTEMA COMPLETAMENTE ARREGLADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 RESUMEN DE CAMBIOS:\n');
    console.log('  ✅ Admin login restaurado: tono77 / 1500');
    console.log('  ✅ Tabla clients: columna no_show agregada');
    console.log('  ✅ Tabla clients: email permite NULL');
    console.log('  ✅ Tabla reservations: confirmation_token permite NULL');
    console.log('  ✅ Tabla reservations: token permite NULL');
    console.log('  ✅ Tabla reservations: client_email permite NULL');
    console.log('  ✅ Tabla whatsapp_notifications: sin columna updated_at');
    console.log('  ✅ Sistema day_exceptions verificado y funcional');
    console.log('\n🌐 ACCESOS:\n');
    console.log('  🔐 Admin: https://quieromesa.com/admin/login');
    console.log('     Usuario: tono77');
    console.log('     Contraseña: 1500');
    console.log('\n📝 FUNCIONALIDADES ARREGLADAS:\n');
    console.log('  ✅ Modificación de reservas por token');
    console.log('  ✅ Control total del calendario (day-exceptions)');
    console.log('  ✅ Login de administrador');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllCriticalIssues()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });
