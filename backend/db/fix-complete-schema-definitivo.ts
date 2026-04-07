import { Pool } from 'pg';

console.log('🔧 ARREGLANDO ESQUEMA COMPLETO DE LA BASE DE DATOS...\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

console.log('✅ Variables de entorno cargadas');
console.log('🔗 Conectando a PostgreSQL...\n');

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixCompleteSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL\n');

    // 1. Arreglar tabla modules
    console.log('📋 Paso 1: Arreglando tabla modules...');
    
    // Verificar si la tabla existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'modules'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('  → Creando tabla modules...');
      await client.query(`
        CREATE TABLE modules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          display_name TEXT,
          description TEXT,
          icon TEXT DEFAULT 'Info',
          color TEXT DEFAULT '#3b82f6',
          route TEXT,
          is_active BOOLEAN DEFAULT true,
          display_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } else {
      // Verificar columnas
      const columns = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'modules'
      `);
      const columnNames = columns.rows.map((r: any) => r.column_name);
      
      if (!columnNames.includes('display_name')) {
        await client.query('ALTER TABLE modules ADD COLUMN display_name TEXT');
      }
      if (!columnNames.includes('icon')) {
        await client.query(`ALTER TABLE modules ADD COLUMN icon TEXT DEFAULT 'Info'`);
      }
      if (!columnNames.includes('color')) {
        await client.query(`ALTER TABLE modules ADD COLUMN color TEXT DEFAULT '#3b82f6'`);
      }
      if (!columnNames.includes('route')) {
        await client.query('ALTER TABLE modules ADD COLUMN route TEXT');
      }
      if (!columnNames.includes('display_order')) {
        await client.query('ALTER TABLE modules ADD COLUMN display_order INTEGER DEFAULT 0');
      }
      if (!columnNames.includes('updated_at')) {
        await client.query('ALTER TABLE modules ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()');
      }
      
      // Quitar restricción NOT NULL de display_name si existe
      await client.query(`
        ALTER TABLE modules ALTER COLUMN display_name DROP NOT NULL
      `).catch(() => {});
    }

    // Eliminar módulos antiguos
    await client.query('DELETE FROM modules');
    
    // Insertar módulos correctos
    const correctModules = [
      {
        id: 'info-config',
        name: 'Configuración',
        displayName: 'Configuración',
        description: 'Configuración básica del restaurante',
        icon: 'Settings',
        color: '#3b82f6',
        route: '/restaurant/config',
        displayOrder: 1,
      },
      {
        id: 'config-pro',
        name: 'Configuración Pro',
        displayName: 'Configuración Pro',
        description: 'Configuración avanzada del restaurante',
        icon: 'Settings',
        color: '#8b5cf6',
        route: '/restaurant/config-pro',
        displayOrder: 2,
      },
      {
        id: 'reservations',
        name: 'Reservas',
        displayName: 'Reservas',
        description: 'Gestión de reservas básica',
        icon: 'Calendar',
        color: '#10b981',
        route: '/restaurant/reservations',
        displayOrder: 3,
      },
      {
        id: 'reservations-pro',
        name: 'Reservas Pro',
        displayName: 'Reservas Pro',
        description: 'Gestión avanzada de reservas',
        icon: 'Calendar',
        color: '#8b5cf6',
        route: '/restaurant/reservations-pro',
        displayOrder: 4,
      },
      {
        id: 'table-management',
        name: 'Gestión Mesas',
        displayName: 'Gestión Mesas',
        description: 'Administración de mesas y ubicaciones',
        icon: 'LayoutGrid',
        color: '#f59e0b',
        route: '/restaurant/tables',
        displayOrder: 5,
      },
      {
        id: 'schedules',
        name: 'Horarios',
        displayName: 'Horarios',
        description: 'Configuración de horarios y turnos',
        icon: 'Clock',
        color: '#8b5cf6',
        route: '/restaurant/schedules',
        displayOrder: 6,
      },
      {
        id: 'client-ratings',
        name: 'Valoraciones',
        displayName: 'Valoraciones',
        description: 'Valoraciones y reseñas de clientes',
        icon: 'Heart',
        color: '#ec4899',
        route: '/restaurant/ratings',
        displayOrder: 7,
      },
    ];

    for (const module of correctModules) {
      await client.query(
        `INSERT INTO modules (id, name, display_name, description, icon, color, route, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())`,
        [
          module.id,
          module.name,
          module.displayName,
          module.description,
          module.icon,
          module.color,
          module.route,
          module.displayOrder,
        ]
      );
    }
    console.log(`  ✅ ${correctModules.length} módulos insertados correctamente`);

    // 2. Arreglar tabla clients - agregar columnas de rating detallado
    console.log('\n📋 Paso 2: Arreglando tabla clients (columnas de rating)...');
    const clientColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'clients'
    `);
    const clientColumnNames = clientColumns.rows.map((r: any) => r.column_name);
    
    if (!clientColumnNames.includes('rating_punctuality')) {
      await client.query('ALTER TABLE clients ADD COLUMN rating_punctuality DECIMAL(3,2) DEFAULT 4.0');
    }
    if (!clientColumnNames.includes('rating_behavior')) {
      await client.query('ALTER TABLE clients ADD COLUMN rating_behavior DECIMAL(3,2) DEFAULT 4.0');
    }
    if (!clientColumnNames.includes('rating_kindness')) {
      await client.query('ALTER TABLE clients ADD COLUMN rating_kindness DECIMAL(3,2) DEFAULT 4.0');
    }
    if (!clientColumnNames.includes('rating_education')) {
      await client.query('ALTER TABLE clients ADD COLUMN rating_education DECIMAL(3,2) DEFAULT 4.0');
    }
    if (!clientColumnNames.includes('rating_tip')) {
      await client.query('ALTER TABLE clients ADD COLUMN rating_tip DECIMAL(3,2) DEFAULT 4.0');
    }
    console.log('  ✅ Columnas de rating detallado agregadas a clients');

    // 3. Arreglar tabla restaurants - agregar columnas faltantes
    console.log('\n📋 Paso 3: Arreglando tabla restaurants...');
    const restColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'restaurants'
    `);
    const restColumnNames = restColumns.rows.map((r: any) => r.column_name);
    
    if (!restColumnNames.includes('auto_send_whatsapp')) {
      await client.query('ALTER TABLE restaurants ADD COLUMN auto_send_whatsapp BOOLEAN DEFAULT false');
    }
    if (!restColumnNames.includes('enable_email_notifications')) {
      await client.query('ALTER TABLE restaurants ADD COLUMN enable_email_notifications BOOLEAN DEFAULT true');
    }
    if (!restColumnNames.includes('notification_phones')) {
      await client.query('ALTER TABLE restaurants ADD COLUMN notification_phones TEXT');
    }
    if (!restColumnNames.includes('notification_email')) {
      await client.query('ALTER TABLE restaurants ADD COLUMN notification_email TEXT');
    }
    console.log('  ✅ Columnas faltantes agregadas a restaurants');

    // 4. Arreglar tabla time_slots - agregar restaurant_id si no existe
    console.log('\n📋 Paso 4: Arreglando tabla time_slots...');
    const timeSlotsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'time_slots'
      );
    `);
    
    if (timeSlotsCheck.rows[0].exists) {
      const tsColumns = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'time_slots'
      `);
      const tsColumnNames = tsColumns.rows.map((r: any) => r.column_name);
      
      if (!tsColumnNames.includes('restaurant_id')) {
        // Necesitamos eliminar la tabla y recrearla porque restaurant_id debe ser NOT NULL
        await client.query('DROP TABLE time_slots CASCADE');
        await client.query(`
          CREATE TABLE time_slots (
            id TEXT PRIMARY KEY,
            time TEXT NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('  ✅ Tabla time_slots recreada correctamente (sin restaurant_id - es global)');
      }
    }

    // 5. Actualizar planes de suscripción con módulos
    console.log('\n📋 Paso 5: Actualizando planes de suscripción...');
    
    const basicModules = ['info-config', 'reservations', 'table-management', 'schedules'];
    const proModules = ['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'];

    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1
      WHERE name ILIKE '%básico%' OR name ILIKE '%basico%'
    `, [JSON.stringify(basicModules)]);
    
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1
      WHERE name ILIKE '%pro%' OR name ILIKE '%profesional%'
    `, [JSON.stringify(proModules)]);
    
    console.log('  ✅ Planes actualizados con módulos correctos');

    // 6. Activar módulos para restaurantes según su plan
    console.log('\n📋 Paso 6: Activando módulos para restaurantes...');
    
    const restaurants = await client.query(`
      SELECT r.id, r.subscription_plan_id, sp.enabled_modules
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
      WHERE r.is_active = true
    `);
    
    for (const restaurant of restaurants.rows) {
      let enabledModules: string[];
      
      if (restaurant.enabled_modules) {
        try {
          enabledModules = JSON.parse(restaurant.enabled_modules);
        } catch {
          enabledModules = restaurant.subscription_plan_id?.includes('pro') ? proModules : basicModules;
        }
      } else if (restaurant.subscription_plan_id && restaurant.enabled_modules) {
        try {
          enabledModules = JSON.parse(restaurant.enabled_modules);
        } catch {
          enabledModules = restaurant.subscription_plan_id.includes('pro') ? proModules : basicModules;
        }
      } else {
        enabledModules = basicModules;
      }
      
      await client.query(
        'UPDATE restaurants SET enabled_modules = $1 WHERE id = $2',
        [JSON.stringify(enabledModules), restaurant.id]
      );
    }
    
    console.log(`  ✅ Módulos activados para ${restaurants.rows.length} restaurantes`);

    // Verificación final
    console.log('\n📋 Paso 7: Verificación final...');
    
    const modulesResult = await client.query('SELECT id, name, display_name FROM modules ORDER BY display_order');
    console.log(`  ✅ ${modulesResult.rows.length} módulos en base de datos`);
    
    const plansResult = await client.query('SELECT name, enabled_modules FROM subscription_plans WHERE is_active = true');
    console.log(`  ✅ ${plansResult.rows.length} planes configurados`);
    
    const restResult = await client.query('SELECT COUNT(*) as count FROM restaurants WHERE is_active = true');
    console.log(`  ✅ ${restResult.rows[0].count} restaurantes activos`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡ESQUEMA COMPLETO ARREGLADO CORRECTAMENTE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixCompleteSchema().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
