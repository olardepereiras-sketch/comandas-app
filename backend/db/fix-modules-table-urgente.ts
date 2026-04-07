import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function fixModulesTable() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Verificando tabla modules...');
    
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'modules'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Creando tabla modules...');
      await pool.query(`
        CREATE TABLE modules (
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
    } else {
      console.log('✅ Tabla modules existe, verificando columnas...');
      
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'modules'
      `);
      
      const existingColumns = columnsCheck.rows.map((r: any) => r.column_name);
      console.log('📋 Columnas existentes:', existingColumns);
      
      const requiredColumns = [
        { name: 'icon', type: 'TEXT NOT NULL', default: "'Info'" },
        { name: 'color', type: 'TEXT NOT NULL', default: "'#3b82f6'" },
        { name: 'route', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
        { name: 'display_order', type: 'INTEGER DEFAULT 0' },
        { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT NOW()' },
        { name: 'updated_at', type: 'TIMESTAMPTZ DEFAULT NOW()' }
      ];
      
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          console.log(`➕ Agregando columna ${col.name}...`);
          const alterSQL = col.default 
            ? `ALTER TABLE modules ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`
            : `ALTER TABLE modules ADD COLUMN ${col.name} ${col.type}`;
          await pool.query(alterSQL);
          console.log(`✅ Columna ${col.name} agregada`);
        }
      }
    }
    
    console.log('📋 Insertando/actualizando módulos por defecto...');
    
    const defaultModules = [
      {
        id: 'info-config',
        name: 'Información y Configuración',
        description: 'Gestión básica de perfil y datos del restaurante',
        icon: 'Info',
        color: '#3b82f6',
        route: '/restaurant/config',
        order: 1,
        active: true
      },
      {
        id: 'config-pro',
        name: 'Configuración Pro',
        description: 'Configuración avanzada con funcionalidades profesionales',
        icon: 'Settings',
        color: '#6366f1',
        route: '/restaurant/config-pro',
        order: 2,
        active: true
      },
      {
        id: 'reservations',
        name: 'Reservas',
        description: 'Sistema básico de gestión de reservas',
        icon: 'Calendar',
        color: '#10b981',
        route: '/restaurant/reservations',
        order: 3,
        active: true
      },
      {
        id: 'reservations-pro',
        name: 'Reservas Pro',
        description: 'Sistema avanzado de reservas con calendario y gestión completa',
        icon: 'CalendarDays',
        color: '#059669',
        route: '/restaurant/reservations-pro',
        order: 4,
        active: true
      },
      {
        id: 'table-management',
        name: 'Gestión de Mesas',
        description: 'Crear y organizar ubicaciones y mesas del restaurante',
        icon: 'LayoutGrid',
        color: '#f59e0b',
        route: '/restaurant/tables',
        order: 5,
        active: true
      },
      {
        id: 'schedules',
        name: 'Horarios',
        description: 'Configuración de horarios, turnos y excepciones',
        icon: 'Clock',
        color: '#8b5cf6',
        route: '/restaurant/schedules',
        order: 6,
        active: true
      },
      {
        id: 'client-ratings',
        name: 'Valoraciones de Clientes',
        description: 'Sistema de valoración de clientes y reservas',
        icon: 'Heart',
        color: '#ec4899',
        route: '/restaurant/ratings',
        order: 7,
        active: true
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
      
      console.log(`  ✅ Módulo "${module.name}" insertado/actualizado`);
    }
    
    const countResult = await pool.query('SELECT COUNT(*) as total FROM modules');
    console.log(`✅ Total módulos en base de datos: ${countResult.rows[0].total}`);
    
    console.log('✅ Tabla modules arreglada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixModulesTable().catch(console.error);
