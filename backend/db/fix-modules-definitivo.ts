import { Pool } from 'pg';

console.log('🔧 ARREGLANDO MÓDULOS DEFINITIVAMENTE...');
console.log('');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixModules() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('');

    console.log('📋 Paso 1: Limpiando y recreando tabla modules...');
    await client.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
    await client.query('DROP TABLE IF EXISTS modules CASCADE');
    
    await client.query(`
      CREATE TABLE modules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        route TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla modules creada');

    console.log('');
    console.log('📋 Paso 2: Insertando módulos con IDs correctos...');
    
    const modules = [
      {
        id: 'info-config',
        name: 'Configuración',
        description: 'Configuración básica del restaurante',
        icon: 'Settings',
        color: '#3b82f6',
        route: '/restaurant/config',
        display_order: 1,
      },
      {
        id: 'config-pro',
        name: 'Configuración Pro',
        description: 'Configuración avanzada del restaurante',
        icon: 'Settings',
        color: '#8b5cf6',
        route: '/restaurant/config-pro',
        display_order: 2,
      },
      {
        id: 'reservations',
        name: 'Reservas',
        description: 'Gestión básica de reservas',
        icon: 'Calendar',
        color: '#10b981',
        route: '/restaurant/reservations',
        display_order: 3,
      },
      {
        id: 'reservations-pro',
        name: 'Reservas Pro',
        description: 'Gestión avanzada de reservas',
        icon: 'Calendar',
        color: '#8b5cf6',
        route: '/restaurant/reservations-pro',
        display_order: 4,
      },
      {
        id: 'table-management',
        name: 'Gestión Mesas',
        description: 'Gestión de mesas y ubicaciones',
        icon: 'LayoutGrid',
        color: '#f59e0b',
        route: '/restaurant/tables',
        display_order: 5,
      },
      {
        id: 'schedules',
        name: 'Horarios',
        description: 'Configuración de horarios y turnos',
        icon: 'Clock',
        color: '#8b5cf6',
        route: '/restaurant/schedules',
        display_order: 6,
      },
      {
        id: 'client-ratings',
        name: 'Valoraciones',
        description: 'Valoración de clientes',
        icon: 'Heart',
        color: '#ec4899',
        route: '/restaurant/ratings',
        display_order: 7,
      },
    ];

    for (const module of modules) {
      await client.query(
        `INSERT INTO modules (id, name, description, icon, color, route, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [module.id, module.name, module.description, module.icon, module.color, module.route, module.display_order]
      );
      console.log(`  ✅ ${module.name}`);
    }

    console.log('');
    console.log('📋 Paso 3: Actualizando planes de suscripción...');
    
    await client.query(`
      UPDATE subscription_plans
      SET enabled_modules = $1
      WHERE name = 'Plan Básico'
    `, [JSON.stringify(['info-config', 'reservations', 'schedules'])]);
    console.log('  ✅ Plan Básico actualizado');

    await client.query(`
      UPDATE subscription_plans
      SET enabled_modules = $1
      WHERE name = 'Plan Profesional'
    `, [JSON.stringify(['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'])]);
    console.log('  ✅ Plan Profesional actualizado');

    console.log('');
    console.log('📋 Paso 4: Creando tabla restaurant_modules...');
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
    console.log('✅ Tabla restaurant_modules creada');

    console.log('');
    console.log('📋 Paso 5: Poblando restaurant_modules desde planes...');
    
    const restaurantsResult = await client.query(`
      SELECT r.id as restaurant_id, r.name as restaurant_name, sp.enabled_modules, sp.name as plan_name
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
      WHERE sp.enabled_modules IS NOT NULL
    `);

    for (const row of restaurantsResult.rows) {
      let enabledModules: string[] = [];
      try {
        enabledModules = typeof row.enabled_modules === 'string' 
          ? JSON.parse(row.enabled_modules) 
          : row.enabled_modules;
      } catch {
        console.warn(`⚠️  No se pudo parsear enabled_modules para restaurante ${row.restaurant_name}`);
        continue;
      }

      console.log(`  • ${row.restaurant_name}: ${enabledModules.length} módulos (Plan: ${row.plan_name})`);

      for (const moduleId of enabledModules) {
        const id = `rm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          await client.query(
            `INSERT INTO restaurant_modules (id, restaurant_id, module_id, is_enabled)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (restaurant_id, module_id) DO NOTHING`,
            [id, row.restaurant_id, moduleId]
          );
        } catch (err) {
          console.error(`    ❌ Error insertando módulo ${moduleId}:`, err);
        }
      }
    }

    console.log('');
    console.log('📋 Paso 6: Verificando configuración final...');
    
    const modulesCount = await client.query('SELECT COUNT(*) FROM modules');
    const restaurantModulesCount = await client.query('SELECT COUNT(*) FROM restaurant_modules');
    const plansResult = await client.query('SELECT name, enabled_modules FROM subscription_plans');
    
    console.log(`✅ ${modulesCount.rows[0].count} módulos en base de datos`);
    console.log(`✅ ${restaurantModulesCount.rows[0].count} módulos asignados a restaurantes`);
    console.log(`✅ ${plansResult.rows.length} planes configurados`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡MÓDULOS ARREGLADOS CORRECTAMENTE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixModules()
  .then(() => {
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en script:', error);
    process.exit(1);
  });
