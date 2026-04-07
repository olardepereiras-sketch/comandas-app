import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function addModulesTable() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Creando tabla de módulos...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        route TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    console.log('✅ Tabla modules creada');
    
    console.log('📋 Insertando módulos por defecto...');
    
    const defaultModules = [
      {
        id: 'configuracion',
        name: 'Configuración',
        description: 'Gestión básica de perfil y datos del restaurante',
        icon: 'Info',
        color: '#3b82f6',
        route: '/restaurant/config',
        order: 1,
        active: true
      },
      {
        id: 'configuracion-pro',
        name: 'Configuración Pro',
        description: 'Configuración avanzada con funcionalidades profesionales',
        icon: 'Settings',
        color: '#6366f1',
        route: '/restaurant/config-pro',
        order: 2,
        active: true
      },
      {
        id: 'reservas',
        name: 'Reservas',
        description: 'Sistema básico de gestión de reservas',
        icon: 'Calendar',
        color: '#10b981',
        route: '/restaurant/reservations',
        order: 3,
        active: true
      },
      {
        id: 'reservas-pro',
        name: 'Reservas Pro',
        description: 'Sistema avanzado de reservas con calendario y gestión completa',
        icon: 'CalendarDays',
        color: '#059669',
        route: '/restaurant/reservations-pro',
        order: 4,
        active: true
      },
      {
        id: 'gestion-mesas',
        name: 'Gestión Mesas',
        description: 'Crear y organizar ubicaciones y mesas del restaurante',
        icon: 'LayoutGrid',
        color: '#f59e0b',
        route: '/restaurant/tables',
        order: 5,
        active: true
      },
      {
        id: 'horarios',
        name: 'Horarios',
        description: 'Configuración de horarios, turnos y excepciones',
        icon: 'Clock',
        color: '#8b5cf6',
        route: '/restaurant/schedules',
        order: 6,
        active: true
      },
      {
        id: 'valoraciones',
        name: 'Clientes VIP y Valoraciones',
        description: 'Sistema de valoración de clientes, gestión de clientes VIP y mesas preferidas',
        icon: 'Heart',
        color: '#ec4899',
        route: '/restaurant/ratings',
        order: 7,
        active: true
      },
      {
        id: 'compras',
        name: 'Compras',
        description: 'Gestión de compras y proveedores (Próximamente)',
        icon: 'ShoppingCart',
        color: '#14b8a6',
        route: null,
        order: 8,
        active: false
      },
      {
        id: 'control-horario',
        name: 'Control Horario',
        description: 'Control de horarios del personal (Próximamente)',
        icon: 'UserClock',
        color: '#f97316',
        route: null,
        order: 9,
        active: false
      }
    ];
    
    for (const module of defaultModules) {
      await pool.query(`
        INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          route = EXCLUDED.route,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `, [module.id, module.name, module.description, module.icon, module.color, module.route, module.order, module.active]);
      
      console.log(`  ✅ Módulo "${module.name}" insertado`);
    }
    
    console.log('✅ Módulos por defecto insertados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addModulesTable().catch(console.error);
