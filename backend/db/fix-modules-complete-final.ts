import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixModulesCompleteFinal() {
  console.log('🔧 ARREGLANDO SISTEMA DE MÓDULOS COMPLETO...');
  console.log('');

  try {
    await pool.query('BEGIN');

    console.log('✅ Conexión establecida con PostgreSQL');
    console.log('');

    console.log('📋 Paso 1: Eliminando tabla restaurant_modules...');
    await pool.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
    console.log('✅ Tabla eliminada');

    console.log('');
    console.log('📋 Paso 2: Eliminando tabla modules...');
    await pool.query('DROP TABLE IF EXISTS modules CASCADE');
    console.log('✅ Tabla eliminada');

    console.log('');
    console.log('📋 Paso 3: Creando tabla modules...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla modules creada');

    console.log('');
    console.log('📋 Paso 4: Insertando módulos...');
    const modules = [
      { id: 'info-config', name: 'Configuración', description: 'Configuración básica del restaurante' },
      { id: 'config-pro', name: 'Configuración Pro', description: 'Configuración avanzada del restaurante' },
      { id: 'reservations', name: 'Reservas', description: 'Gestión de reservas básica' },
      { id: 'reservations-pro', name: 'Reservas Pro', description: 'Gestión avanzada de reservas' },
      { id: 'table-management', name: 'Gestión Mesas', description: 'Gestión de mesas del restaurante' },
      { id: 'schedules', name: 'Horarios', description: 'Configuración de horarios' },
      { id: 'client-ratings', name: 'Valoraciones', description: 'Sistema de valoraciones de clientes' },
    ];

    for (const module of modules) {
      await pool.query(
        'INSERT INTO modules (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3',
        [module.id, module.name, module.description]
      );
      console.log(`  ✅ ${module.name}`);
    }

    console.log('');
    console.log('📋 Paso 5: Creando tabla restaurant_modules...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS restaurant_modules (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'rm-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8),
        restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        module_id VARCHAR(50) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        is_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, module_id)
      )
    `);
    console.log('✅ Tabla restaurant_modules creada');

    console.log('');
    console.log('📋 Paso 6: Limpiando módulos de planes de suscripción...');
    await pool.query(`
      UPDATE subscription_plans 
      SET enabled_modules = '[]'::jsonb
      WHERE enabled_modules IS NOT NULL
    `);
    console.log('✅ Módulos limpiados de planes');

    console.log('');
    console.log('📋 Paso 7: Asignando módulos correctos a Plan Básico...');
    const basicModules = ['info-config', 'reservations', 'table-management', 'schedules', 'client-ratings'];
    await pool.query(
      `UPDATE subscription_plans 
       SET enabled_modules = $1::jsonb
       WHERE name = $2`,
      [JSON.stringify(basicModules), 'Plan Básico']
    );
    console.log('✅ Plan Básico configurado con:', basicModules.join(', '));

    console.log('');
    console.log('📋 Paso 8: Asignando módulos correctos a Plan Profesional...');
    const proModules = ['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'];
    await pool.query(
      `UPDATE subscription_plans 
       SET enabled_modules = $1::jsonb
       WHERE name = $2`,
      [JSON.stringify(proModules), 'Plan Profesional']
    );
    console.log('✅ Plan Profesional configurado con:', proModules.join(', '));

    console.log('');
    console.log('📋 Paso 9: Activando módulos para restaurantes según su plan...');
    
    const restaurantsResult = await pool.query(`
      SELECT r.id, r.name, r.subscription_plan_id, sp.enabled_modules, sp.name as plan_name
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
    `);

    for (const restaurant of restaurantsResult.rows) {
      console.log(`\n  • ${restaurant.name} (Plan: ${restaurant.plan_name || 'Sin plan'})`);
      
      await pool.query(
        'DELETE FROM restaurant_modules WHERE restaurant_id = $1',
        [restaurant.id]
      );

      let modulesToEnable = proModules;
      if (restaurant.enabled_modules) {
        const planModules = typeof restaurant.enabled_modules === 'string' 
          ? JSON.parse(restaurant.enabled_modules)
          : restaurant.enabled_modules;
        modulesToEnable = Array.isArray(planModules) ? planModules : proModules;
      }

      for (const moduleId of modulesToEnable) {
        await pool.query(
          `INSERT INTO restaurant_modules (restaurant_id, module_id, is_enabled)
           VALUES ($1, $2, true)
           ON CONFLICT (restaurant_id, module_id) DO UPDATE SET is_enabled = true`,
          [restaurant.id, moduleId]
        );
      }
      
      console.log(`    ✅ ${modulesToEnable.length} módulos activados`);
    }

    await pool.query('COMMIT');

    console.log('');
    console.log('📋 Verificando configuración final...');
    const modulesCount = await pool.query('SELECT COUNT(*) FROM modules');
    const restaurantModulesCount = await pool.query('SELECT COUNT(*) FROM restaurant_modules WHERE is_enabled = true');
    const plansCount = await pool.query('SELECT COUNT(*) FROM subscription_plans');
    
    console.log(`✅ ${modulesCount.rows[0].count} módulos en base de datos`);
    console.log(`✅ ${restaurantModulesCount.rows[0].count} módulos activos para restaurantes`);
    console.log(`✅ ${plansCount.rows[0].count} planes configurados`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡SISTEMA DE MÓDULOS ARREGLADO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixModulesCompleteFinal().catch((error) => {
  console.error('❌ Error en migración:', error);
  process.exit(1);
});
