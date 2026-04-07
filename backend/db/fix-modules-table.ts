import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT || 
  process.env.DATABASE_URL || 
  'postgresql://quieromesa_user:Sebas5566@localhost:5432/quieromesa_db';

console.log('🔗 Conectando a base de datos...');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

async function fixModulesTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tabla modules...');
    
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'modules'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tabla modules no existe. Creándola...');
      
      await client.query(`
        CREATE TABLE modules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT 'Info',
          color TEXT NOT NULL DEFAULT '#3b82f6',
          route TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          display_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log('✅ Tabla modules creada');
      
      console.log('📋 Insertando módulos predeterminados...');
      
      const defaultModules = [
        { id: 'info-config', name: 'Información Básica', description: 'Configuración de información del restaurante', icon: 'Info', color: '#3b82f6', route: '/restaurant/config', order: 0 },
        { id: 'config-pro', name: 'Configuración Avanzada', description: 'Opciones avanzadas y notificaciones', icon: 'Settings', color: '#8b5cf6', route: '/restaurant/config-pro', order: 1 },
        { id: 'reservations', name: 'Gestión de Reservas', description: 'Administra las reservas del restaurante', icon: 'Calendar', color: '#10b981', route: '/restaurant/reservations', order: 2 },
        { id: 'reservations-pro', name: 'Reservas Profesional', description: 'Vista avanzada de reservas con calendario', icon: 'CalendarDays', color: '#f59e0b', route: '/restaurant/reservations-pro', order: 3 },
        { id: 'table-management', name: 'Gestión de Mesas', description: 'Administra mesas, ubicaciones y grupos', icon: 'LayoutGrid', color: '#ef4444', route: '/restaurant/tables', order: 4 },
        { id: 'schedules', name: 'Horarios y Turnos', description: 'Configura horarios y plantillas de turnos', icon: 'Clock', color: '#6366f1', route: '/restaurant/schedules', order: 5 },
        { id: 'client-ratings', name: 'Valoraciones de Clientes', description: 'Sistema de valoración y seguimiento de clientes', icon: 'Heart', color: '#ec4899', route: '/restaurant/ratings', order: 6 },
      ];
      
      for (const module of defaultModules) {
        await client.query(
          `INSERT INTO modules (id, name, description, icon, color, route, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [module.id, module.name, module.description, module.icon, module.color, module.route, module.order]
        );
      }
      
      console.log('✅ Módulos predeterminados insertados');
    } else {
      console.log('✅ Tabla modules existe');
      
      console.log('🔍 Verificando columnas...');
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'modules'
        ORDER BY ordinal_position;
      `);
      
      const existingColumns = columnsCheck.rows.map((r: any) => r.column_name);
      console.log('📋 Columnas existentes:', existingColumns);
      
      const requiredColumns = [
        { name: 'id', type: 'TEXT PRIMARY KEY' },
        { name: 'name', type: 'TEXT NOT NULL' },
        { name: 'description', type: 'TEXT NOT NULL' },
        { name: 'icon', type: 'TEXT NOT NULL DEFAULT \'Info\'' },
        { name: 'color', type: 'TEXT NOT NULL DEFAULT \'#3b82f6\'' },
        { name: 'route', type: 'TEXT' },
        { name: 'is_active', type: 'BOOLEAN NOT NULL DEFAULT true' },
        { name: 'display_order', type: 'INTEGER NOT NULL DEFAULT 0' },
        { name: 'created_at', type: 'TIMESTAMP NOT NULL DEFAULT NOW()' },
        { name: 'updated_at', type: 'TIMESTAMP NOT NULL DEFAULT NOW()' }
      ];
      
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          console.log(`➕ Agregando columna ${col.name}...`);
          await client.query(`ALTER TABLE modules ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Columna ${col.name} agregada`);
        }
      }
      
      const modulesCount = await client.query('SELECT COUNT(*) FROM modules');
      console.log(`📊 Módulos en tabla: ${modulesCount.rows[0].count}`);
      
      if (parseInt(modulesCount.rows[0].count) === 0) {
        console.log('📋 Insertando módulos predeterminados...');
        
        const defaultModules = [
          { id: 'info-config', name: 'Información Básica', description: 'Configuración de información del restaurante', icon: 'Info', color: '#3b82f6', route: '/restaurant/config', order: 0 },
          { id: 'config-pro', name: 'Configuración Avanzada', description: 'Opciones avanzadas y notificaciones', icon: 'Settings', color: '#8b5cf6', route: '/restaurant/config-pro', order: 1 },
          { id: 'reservations', name: 'Gestión de Reservas', description: 'Administra las reservas del restaurante', icon: 'Calendar', color: '#10b981', route: '/restaurant/reservations', order: 2 },
          { id: 'reservations-pro', name: 'Reservas Profesional', description: 'Vista avanzada de reservas con calendario', icon: 'CalendarDays', color: '#f59e0b', route: '/restaurant/reservations-pro', order: 3 },
          { id: 'table-management', name: 'Gestión de Mesas', description: 'Administra mesas, ubicaciones y grupos', icon: 'LayoutGrid', color: '#ef4444', route: '/restaurant/tables', order: 4 },
          { id: 'schedules', name: 'Horarios y Turnos', description: 'Configura horarios y plantillas de turnos', icon: 'Clock', color: '#6366f1', route: '/restaurant/schedules', order: 5 },
          { id: 'client-ratings', name: 'Valoraciones de Clientes', description: 'Sistema de valoración y seguimiento de clientes', icon: 'Heart', color: '#ec4899', route: '/restaurant/ratings', order: 6 },
        ];
        
        for (const module of defaultModules) {
          await client.query(
            `INSERT INTO modules (id, name, description, icon, color, route, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [module.id, module.name, module.description, module.icon, module.color, module.route, module.order]
          );
        }
        
        console.log('✅ Módulos predeterminados insertados');
      }
    }
    
    console.log('🔍 Verificando módulos actuales...');
    const allModules = await client.query('SELECT id, name FROM modules ORDER BY display_order');
    console.log('📋 Módulos en base de datos:', allModules.rows);
    
    console.log('✅ Tabla modules verificada y corregida exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixModulesTable()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
