import { Pool } from 'pg';

console.log('🔄 Poblando módulos reales del sistema...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const realModules = [
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
    icon: 'CalendarDays',
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
    name: 'Clientes VIP y Valoraciones',
    description: 'Valoraciones y reseñas de clientes, gestión de clientes VIP',
    icon: 'Heart',
    color: '#ec4899',
    route: '/restaurant/ratings',
    displayOrder: 7,
  },
  {
    id: 'purchases',
    name: 'Compras',
    description: 'Gestión de compras y proveedores',
    icon: 'ShoppingCart',
    color: '#06b6d4',
    route: '/restaurant/purchases',
    displayOrder: 8,
  },
  {
    id: 'time-control',
    name: 'Control Horario',
    description: 'Control de horario del personal',
    icon: 'UserClock',
    color: '#f97316',
    route: '/restaurant/time-control',
    displayOrder: 9,
  },
];

async function populateModules() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('🗑️ Eliminando módulos existentes...');
    await client.query('DELETE FROM modules');

    console.log('📋 Insertando módulos reales...');
    for (const module of realModules) {
      await client.query(
        `INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          module.id,
          module.name,
          module.description,
          module.icon,
          module.color,
          module.route,
          module.displayOrder,
          true,
        ]
      );
      console.log(`  ✅ ${module.name}`);
    }

    console.log('\n✅ Módulos poblados exitosamente!');
    console.log(`📊 Total de módulos: ${realModules.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

populateModules();
