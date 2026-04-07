import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔧 Arreglando TODOS los problemas del esquema de la base de datos...');

function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), 'env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
    console.log('✅ Variables de entorno cargadas desde archivo env');
  } catch {
    console.warn('⚠️ No se pudo cargar archivo env, usando variables del sistema');
  }
}

loadEnvFile();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  console.error('DATABASE_URL actual:', process.env.DATABASE_URL);
  process.exit(1);
}

console.log('🔗 Conectando a:', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixAllSchemaIssues() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('\n📋 1. Agregando columnas faltantes en tabla clients...');
    await client.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS rating_punctuality DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_behavior DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_kindness DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_education DECIMAL(3,2) DEFAULT 4.0,
      ADD COLUMN IF NOT EXISTS rating_tip DECIMAL(3,2) DEFAULT 4.0
    `);
    console.log('✅ Columnas de rating detallado agregadas a clients');

    console.log('\n📋 2. Agregando columnas faltantes en tabla restaurants...');
    await client.query(`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS notification_phones TEXT,
      ADD COLUMN IF NOT EXISTS notification_email TEXT,
      ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS min_booking_advance_minutes INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS min_modify_cancel_minutes INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS table_rotation_time INTEGER DEFAULT 120,
      ADD COLUMN IF NOT EXISTS auto_send_whatsapp BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS use_whatsapp_web BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_custom_message TEXT,
      ADD COLUMN IF NOT EXISTS available_high_chairs INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS high_chair_rotation_minutes INTEGER DEFAULT 120,
      ADD COLUMN IF NOT EXISTS reminder1_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder1_hours INTEGER DEFAULT 24,
      ADD COLUMN IF NOT EXISTS reminder2_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder2_minutes INTEGER DEFAULT 60,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `);
    console.log('✅ Todas las columnas agregadas a restaurants');

    console.log('\n📋 3. Verificando y arreglando tabla modules...');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'modules'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('  → Tabla modules existe, verificando columnas...');
      
      await client.query(`
        ALTER TABLE modules 
        ADD COLUMN IF NOT EXISTS display_name TEXT,
        ADD COLUMN IF NOT EXISTS icon TEXT,
        ADD COLUMN IF NOT EXISTS color TEXT,
        ADD COLUMN IF NOT EXISTS route TEXT,
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('  → Columnas agregadas');
      
      await client.query(`
        UPDATE modules SET display_name = name WHERE display_name IS NULL
      `);
      console.log('  → display_name actualizado');
      
      await client.query(`
        ALTER TABLE modules 
        ALTER COLUMN display_name SET NOT NULL
      `);
      console.log('  → Restricción NOT NULL aplicada');
      
    } else {
      await client.query(`
        CREATE TABLE modules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          color TEXT,
          route TEXT,
          display_order INTEGER DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('  → Tabla modules creada');
    }
    console.log('✅ Tabla modules lista');

    console.log('\n📋 4. Creando tabla restaurant_modules si no existe...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_modules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        UNIQUE(restaurant_id, module_id)
      )
    `);
    console.log('✅ Tabla restaurant_modules creada');

    console.log('\n📋 5. Insertando módulos del sistema...');
    const modulesData = [
      {
        id: 'mod-mesas',
        name: 'tables',
        displayName: 'Gestión de Mesas',
        description: 'Organiza mesas y ubicaciones',
        icon: 'LayoutGrid',
        color: '#3b82f6',
        route: '/restaurant/tables',
        order: 1
      },
      {
        id: 'mod-horarios',
        name: 'schedules',
        displayName: 'Horarios',
        description: 'Configura horarios y turnos',
        icon: 'Clock',
        color: '#8b5cf6',
        route: '/restaurant/schedules',
        order: 2
      },
      {
        id: 'mod-reservas',
        name: 'reservations',
        displayName: 'Reservas',
        description: 'Gestiona reservas de clientes',
        icon: 'Calendar',
        color: '#10b981',
        route: '/restaurant/reservations',
        order: 3
      },
      {
        id: 'mod-valoraciones',
        name: 'ratings',
        displayName: 'Valoraciones',
        description: 'Valora a tus clientes',
        icon: 'Heart',
        color: '#ef4444',
        route: '/restaurant/ratings',
        order: 4
      },
      {
        id: 'mod-config',
        name: 'config',
        displayName: 'Configuración',
        description: 'Ajustes del restaurante',
        icon: 'Settings',
        color: '#6b7280',
        route: '/restaurant/config',
        order: 5
      }
    ];

    for (const mod of modulesData) {
      await client.query(`
        INSERT INTO modules (id, name, display_name, description, icon, color, route, display_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          route = EXCLUDED.route,
          display_order = EXCLUDED.display_order,
          updated_at = NOW()
      `, [mod.id, mod.name, mod.displayName, mod.description, mod.icon, mod.color, mod.route, mod.order]);
    }
    console.log('✅ Módulos insertados/actualizados');

    console.log('\n📋 6. Creando tabla whatsapp_notifications_queue si no existe...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_notifications_queue (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMP,
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla whatsapp_notifications_queue creada');

    console.log('\n📋 7. Verificando que enabled_modules existe en subscription_plans...');
    const checkEnabledModules = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscription_plans' AND column_name = 'enabled_modules'
    `);
    
    if (checkEnabledModules.rows.length === 0) {
      await client.query(`
        ALTER TABLE subscription_plans 
        ADD COLUMN enabled_modules TEXT NOT NULL DEFAULT '[]'
      `);
      console.log('✅ Columna enabled_modules agregada a subscription_plans');
    } else {
      console.log('✅ Columna enabled_modules ya existe');
    }

    console.log('\n📋 8. Actualizando planes de suscripción con módulos...');
    const plans = await client.query('SELECT id, name FROM subscription_plans');
    
    for (const plan of plans.rows) {
      let enabledModules: string[];
      
      if (plan.name.toLowerCase().includes('pro') || plan.name.toLowerCase().includes('premium')) {
        enabledModules = modulesData.map(m => m.id);
      } else {
        enabledModules = [
          'mod-mesas',
          'mod-horarios',
          'mod-reservas',
          'mod-config'
        ];
      }
      
      await client.query(
        'UPDATE subscription_plans SET enabled_modules = $1 WHERE id = $2',
        [JSON.stringify(enabledModules), plan.id]
      );
      console.log(`  ✅ Plan "${plan.name}" actualizado con ${enabledModules.length} módulos`);
    }

    console.log('\n🎉 TODOS los problemas del esquema han sido arreglados correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllSchemaIssues()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
