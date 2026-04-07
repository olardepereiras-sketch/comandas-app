import { Pool } from 'pg';

console.log('🔧 ARREGLANDO SISTEMA DE MÓDULOS COMPLETO...\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

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

const basicModules = ['info-config', 'reservations', 'table-management', 'schedules'];
const proModules = ['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'];

async function fixModulesSystem() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL\n');

    // 1. Arreglar tabla modules
    console.log('📋 Paso 1: Arreglando tabla modules...');
    
    await client.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
    console.log('  → Tabla restaurant_modules eliminada (se recreará)');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'modules'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
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
      
      await client.query(`
        ALTER TABLE modules ALTER COLUMN display_name DROP NOT NULL
      `).catch(() => {});
    }

    await client.query('DELETE FROM modules');
    
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
    console.log(`  ✅ ${correctModules.length} módulos insertados correctamente\n`);

    // 2. Crear tabla restaurant_modules
    console.log('📋 Paso 2: Creando tabla restaurant_modules...');
    await client.query(`
      CREATE TABLE restaurant_modules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        UNIQUE (restaurant_id, module_id)
      )
    `);
    console.log('  ✅ Tabla restaurant_modules creada\n');

    // 3. Actualizar planes con módulos correctos
    console.log('📋 Paso 3: Actualizando planes de suscripción...');
    
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
    
    console.log('  ✅ Planes actualizados\n');

    // 4. Poblar restaurant_modules según el plan de cada restaurante
    console.log('📋 Paso 4: Poblando restaurant_modules...');
    
    const restaurants = await client.query(`
      SELECT r.id, r.name, r.subscription_plan_id, sp.name as plan_name, sp.enabled_modules
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
      WHERE r.is_active = true
    `);

    let totalInserted = 0;
    for (const restaurant of restaurants.rows) {
      let modulesToEnable: string[] = [];
      
      if (restaurant.enabled_modules) {
        try {
          modulesToEnable = JSON.parse(restaurant.enabled_modules);
        } catch {
          modulesToEnable = restaurant.plan_name?.toLowerCase().includes('pro') ? proModules : basicModules;
        }
      } else {
        modulesToEnable = restaurant.plan_name?.toLowerCase().includes('pro') ? proModules : basicModules;
      }

      console.log(`  → ${restaurant.name}: ${modulesToEnable.length} módulos (Plan: ${restaurant.plan_name || 'N/A'})`);

      for (const moduleId of modulesToEnable) {
        const id = `rm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `INSERT INTO restaurant_modules (id, restaurant_id, module_id, is_enabled)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (restaurant_id, module_id) DO NOTHING`,
          [id, restaurant.id, moduleId]
        );
        totalInserted++;
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    console.log(`\n  ✅ ${totalInserted} módulos de restaurante insertados\n`);

    // 5. Verificación final
    console.log('📋 Paso 5: Verificación final...');
    
    const modulesCount = await client.query('SELECT COUNT(*) as count FROM modules');
    console.log(`  ✅ ${modulesCount.rows[0].count} módulos en tabla modules`);
    
    const rmCount = await client.query('SELECT COUNT(*) as count FROM restaurant_modules');
    console.log(`  ✅ ${rmCount.rows[0].count} relaciones en restaurant_modules`);
    
    const activeRest = await client.query('SELECT COUNT(*) as count FROM restaurants WHERE is_active = true');
    console.log(`  ✅ ${activeRest.rows[0].count} restaurantes activos`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡SISTEMA DE MÓDULOS ARREGLADO CORRECTAMENTE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixModulesSystem().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
