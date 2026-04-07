import { Pool } from 'pg';

console.log('🔧 ARREGLANDO TODO EL SISTEMA DE UNA VEZ\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixEverything() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL\n');

    console.log('📋 Paso 1: Arreglando tabla modules...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
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
    
    await client.query(`ALTER TABLE modules ALTER COLUMN display_name DROP NOT NULL`).catch(() => {});
    
    await client.query('DELETE FROM modules');
    
    const modulesData = [
      { id: 'info-config', name: 'Configuración', displayName: 'Configuración', description: 'Configuración básica del restaurante', icon: 'Settings', color: '#3b82f6', route: '/restaurant/config', order: 1 },
      { id: 'config-pro', name: 'Configuración Pro', displayName: 'Configuración Pro', description: 'Configuración avanzada con notificaciones y recordatorios', icon: 'Settings', color: '#7c3aed', route: '/restaurant/config-pro', order: 2 },
      { id: 'reservations', name: 'Reservas', displayName: 'Reservas', description: 'Gestión de reservas', icon: 'Calendar', color: '#10b981', route: '/restaurant/reservations', order: 3 },
      { id: 'reservations-pro', name: 'Reservas Pro', displayName: 'Reservas Pro', description: 'Gestión avanzada de reservas con calendario', icon: 'CalendarCheck', color: '#8b5cf6', route: '/restaurant/reservations-pro', order: 4 },
      { id: 'tables', name: 'Gestión Mesas', displayName: 'Mesas', description: 'Gestión de mesas y ubicaciones', icon: 'Utensils', color: '#f59e0b', route: '/restaurant/tables', order: 5 },
      { id: 'schedules', name: 'Horarios', displayName: 'Horarios', description: 'Configuración de horarios y turnos', icon: 'Clock', color: '#8b5cf6', route: '/restaurant/schedules', order: 6 },
      { id: 'ratings', name: 'Valoraciones', displayName: 'Valoraciones', description: 'Sistema de valoración de clientes', icon: 'Star', color: '#eab308', route: '/restaurant/ratings', order: 7 },
    ];

    for (const mod of modulesData) {
      await client.query(
        `INSERT INTO modules (id, name, display_name, description, icon, color, route, is_active, display_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())`,
        [mod.id, mod.name, mod.displayName, mod.description, mod.icon, mod.color, mod.route, mod.order]
      );
    }
    console.log('✅ Tabla modules arreglada con 7 módulos\n');

    console.log('📋 Paso 2: Arreglando tabla time_slots (sin restaurant_id)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id TEXT PRIMARY KEY,
        time TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    const timeSlotColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'time_slots'
    `);
    const timeSlotColumnNames = timeSlotColumns.rows.map((r: any) => r.column_name);
    
    if (timeSlotColumnNames.includes('restaurant_id')) {
      await client.query(`ALTER TABLE time_slots ALTER COLUMN restaurant_id DROP NOT NULL`).catch(() => {});
      await client.query(`ALTER TABLE time_slots DROP COLUMN restaurant_id`).catch(() => {});
    }
    
    await client.query('DELETE FROM time_slots');
    
    const times = [];
    for (let hour = 12; hour <= 23; hour++) {
      times.push(`${String(hour).padStart(2, '0')}:00`);
      times.push(`${String(hour).padStart(2, '0')}:30`);
    }
    times.push('00:00');
    
    for (const time of times) {
      await client.query(
        `INSERT INTO time_slots (id, time, is_active, created_at)
         VALUES ($1, $2, true, NOW())`,
        [`time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, time]
      );
    }
    console.log(`✅ Tabla time_slots arreglada con ${times.length} horas\n`);

    console.log('📋 Paso 3: Arreglando tabla shift_templates...');
    const shiftTemplateColumns = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'shift_templates'
    `);
    const shiftTemplateColumnNames = shiftTemplateColumns.rows.map((r: any) => r.column_name);
    
    if (shiftTemplateColumnNames.includes('time_slots') && !shiftTemplateColumnNames.includes('times')) {
      await client.query(`ALTER TABLE shift_templates RENAME COLUMN time_slots TO times`);
    } else if (!shiftTemplateColumnNames.includes('times')) {
      await client.query(`ALTER TABLE shift_templates ADD COLUMN times TEXT NOT NULL DEFAULT '[]'`);
      if (shiftTemplateColumnNames.includes('time_slots')) {
        await client.query(`UPDATE shift_templates SET times = time_slots`);
        await client.query(`ALTER TABLE shift_templates DROP COLUMN time_slots`);
      }
    }
    
    const columnsToRemove = ['max_guests_per_hour', 'min_rating', 'min_local_rating'];
    for (const col of columnsToRemove) {
      if (shiftTemplateColumnNames.includes(col)) {
        await client.query(`ALTER TABLE shift_templates DROP COLUMN IF EXISTS ${col}`);
      }
    }
    console.log('✅ Tabla shift_templates arreglada\n');

    console.log('📋 Paso 4: Actualizando planes de suscripción...');
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1 
      WHERE name = 'Plan Básico'
    `, [JSON.stringify(['info-config', 'reservations', 'tables', 'schedules'])]);
    
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1 
      WHERE name = 'Plan Profesional'
    `, [JSON.stringify(['info-config', 'config-pro', 'reservations', 'reservations-pro', 'tables', 'schedules', 'ratings'])]);
    console.log('✅ Planes actualizados\n');

    console.log('📋 Paso 5: Activando módulos para restaurantes según su plan...');
    await client.query(`CREATE TABLE IF NOT EXISTS restaurant_modules (
      restaurant_id TEXT NOT NULL,
      module_id TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (restaurant_id, module_id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    )`);
    
    const restaurants = await client.query(`
      SELECT r.id, r.name, sp.name as plan_name, sp.enabled_modules
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
    `);
    
    for (const restaurant of restaurants.rows) {
      const enabledModules = restaurant.enabled_modules ? JSON.parse(restaurant.enabled_modules) : [];
      
      await client.query(`DELETE FROM restaurant_modules WHERE restaurant_id = $1`, [restaurant.id]);
      
      for (const moduleId of enabledModules) {
        await client.query(
          `INSERT INTO restaurant_modules (restaurant_id, module_id, is_active, created_at)
           VALUES ($1, $2, true, NOW())
           ON CONFLICT (restaurant_id, module_id) 
           DO UPDATE SET is_active = true`,
          [restaurant.id, moduleId]
        );
      }
      
      console.log(`  ✅ ${restaurant.name}: ${enabledModules.length} módulos activados (Plan: ${restaurant.plan_name})`);
    }

    console.log('\n📋 Paso 6: Verificación final...');
    const moduleCount = await client.query('SELECT COUNT(*) FROM modules');
    const timeSlotCount = await client.query('SELECT COUNT(*) FROM time_slots');
    const planCount = await client.query('SELECT COUNT(*) FROM subscription_plans');
    
    console.log(`✅ ${moduleCount.rows[0].count} módulos en base de datos`);
    console.log(`✅ ${timeSlotCount.rows[0].count} horas disponibles`);
    console.log(`✅ ${planCount.rows[0].count} planes configurados`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡TODO EL SISTEMA ARREGLADO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEverything().catch(console.error);
