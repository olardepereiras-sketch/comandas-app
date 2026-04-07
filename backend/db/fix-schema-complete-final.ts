import { Pool } from 'pg';

console.log('🔧 ARREGLANDO ESQUEMA COMPLETO...\n');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
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
    description: 'Configuración básica del restaurante',
    icon: 'Settings',
    color: '#3b82f6',
    route: '/restaurant/config',
    displayOrder: 1,
  },
  {
    id: 'config-pro',
    name: 'Configuración Pro',
    description: 'Configuración avanzada del restaurante',
    icon: 'Settings',
    color: '#8b5cf6',
    route: '/restaurant/config-pro',
    displayOrder: 2,
  },
  {
    id: 'reservations',
    name: 'Reservas',
    description: 'Gestión de reservas básica',
    icon: 'Calendar',
    color: '#10b981',
    route: '/restaurant/reservations',
    displayOrder: 3,
  },
  {
    id: 'reservations-pro',
    name: 'Reservas Pro',
    description: 'Gestión avanzada de reservas',
    icon: 'Calendar',
    color: '#8b5cf6',
    route: '/restaurant/reservations-pro',
    displayOrder: 4,
  },
  {
    id: 'table-management',
    name: 'Gestión Mesas',
    description: 'Administración de mesas y ubicaciones',
    icon: 'LayoutGrid',
    color: '#f59e0b',
    route: '/restaurant/tables',
    displayOrder: 5,
  },
  {
    id: 'schedules',
    name: 'Horarios',
    description: 'Configuración de horarios y turnos',
    icon: 'Clock',
    color: '#8b5cf6',
    route: '/restaurant/schedules',
    displayOrder: 6,
  },
  {
    id: 'client-ratings',
    name: 'Valoraciones',
    description: 'Valoraciones y reseñas de clientes',
    icon: 'Heart',
    color: '#ec4899',
    route: '/restaurant/ratings',
    displayOrder: 7,
  },
];

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL\n');

    console.log('📋 Paso 1: Arreglando tabla modules...');
    
    await client.query('DROP TABLE IF EXISTS restaurant_modules CASCADE');
    await client.query('DROP TABLE IF EXISTS modules CASCADE');
    
    await client.query(`
      CREATE TABLE modules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'Info',
        color TEXT DEFAULT '#3b82f6',
        route TEXT,
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Tabla modules creada correctamente');

    console.log('\n📋 Paso 2: Insertando módulos...');
    for (const module of correctModules) {
      await client.query(
        `INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())`,
        [
          module.id,
          module.name,
          module.description,
          module.icon,
          module.color,
          module.route,
          module.displayOrder,
        ]
      );
      console.log(`  ✅ ${module.name}`);
    }

    console.log('\n📋 Paso 3: Arreglando tabla time_slots (global, sin restaurant_id)...');
    await client.query('DROP TABLE IF EXISTS time_slots CASCADE');
    await client.query(`
      CREATE TABLE time_slots (
        id TEXT PRIMARY KEY,
        time TEXT NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla time_slots creada correctamente');

    console.log('\n📋 Paso 4: Insertando horas 12:00 - 00:00...');
    const hours = [
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
      '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00'
    ];

    for (const time of hours) {
      const id = `time-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await client.query(
        'INSERT INTO time_slots (id, time, is_active, created_at) VALUES ($1, $2, true, NOW())',
        [id, time]
      );
    }
    console.log(`✅ ${hours.length} horas creadas`);

    console.log('\n📋 Paso 5: Actualizando planes de suscripción...');
    
    const basicModules = ['info-config', 'reservations', 'table-management', 'schedules'];
    const proModules = ['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'];

    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1
      WHERE name ILIKE '%básico%' OR name ILIKE '%basico%'
    `, [JSON.stringify(basicModules)]);
    console.log('  ✅ Plan Básico actualizado');

    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1
      WHERE name ILIKE '%pro%' OR name ILIKE '%profesional%'
    `, [JSON.stringify(proModules)]);
    console.log('  ✅ Plan Pro actualizado');

    console.log('\n📋 Paso 6: Activando módulos para restaurantes...');
    const restaurantsResult = await client.query(`
      SELECT r.id, r.name, r.subscription_plan_id, sp.enabled_modules, sp.name as plan_name
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
      WHERE r.is_active = true
    `);

    for (const restaurant of restaurantsResult.rows) {
      const enabledModules = restaurant.enabled_modules 
        ? (Array.isArray(restaurant.enabled_modules) ? restaurant.enabled_modules : JSON.parse(restaurant.enabled_modules || '[]'))
        : proModules;
      
      console.log(`  • ${restaurant.name}: ${enabledModules.length} módulos (Plan: ${restaurant.plan_name || 'Sin plan'})`);
    }

    console.log('\n📋 Paso 7: Verificando configuración final...');
    const modulesCount = await client.query('SELECT COUNT(*) FROM modules');
    const timeSlotsCount = await client.query('SELECT COUNT(*) FROM time_slots');
    const plansResult = await client.query('SELECT name, enabled_modules FROM subscription_plans WHERE is_active = true');
    
    console.log(`✅ ${modulesCount.rows[0].count} módulos en base de datos`);
    console.log(`✅ ${timeSlotsCount.rows[0].count} horas disponibles`);
    console.log(`✅ ${plansResult.rows.length} planes configurados`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ¡ESQUEMA ARREGLADO CORRECTAMENTE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
