import { Pool } from 'pg';

console.log('🔧 Arreglando esquema de tabla modules...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Falta variable de entorno DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixModulesSchema() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Conexión establecida con PostgreSQL');

    console.log('📋 Verificando columnas existentes...');
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'modules'
    `);
    
    const existingColumns = columns.rows.map((row: any) => row.column_name);
    console.log('  → Columnas actuales:', existingColumns);

    if (!existingColumns.includes('icon')) {
      console.log('📋 Agregando columna icon...');
      await client.query(`ALTER TABLE modules ADD COLUMN icon TEXT DEFAULT 'Info'`);
    }

    if (!existingColumns.includes('color')) {
      console.log('📋 Agregando columna color...');
      await client.query(`ALTER TABLE modules ADD COLUMN color TEXT DEFAULT '#3b82f6'`);
    }

    if (!existingColumns.includes('route')) {
      console.log('📋 Agregando columna route...');
      await client.query(`ALTER TABLE modules ADD COLUMN route TEXT`);
    }

    if (!existingColumns.includes('display_order')) {
      console.log('📋 Agregando columna display_order...');
      await client.query(`ALTER TABLE modules ADD COLUMN display_order INTEGER DEFAULT 0`);
    }

    if (!existingColumns.includes('updated_at')) {
      console.log('📋 Agregando columna updated_at...');
      await client.query(`ALTER TABLE modules ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
    }

    console.log('📋 Limpiando datos antiguos de módulos...');
    await client.query(`DELETE FROM modules`);

    console.log('📋 Insertando módulos con estructura correcta...');
    await client.query(`
      INSERT INTO modules (id, name, display_name, description, icon, color, route, is_active, display_order, created_at, updated_at)
      VALUES
        ('mod-mesas', 'mesas', 'Gestión de Mesas', 'Organiza mesas y ubicaciones', 'LayoutGrid', '#3b82f6', '/restaurant/tables', true, 1, NOW(), NOW()),
        ('mod-horarios', 'horarios', 'Horarios y Turnos', 'Configura horarios de servicio', 'Clock', '#10b981', '/restaurant/schedules', true, 2, NOW(), NOW()),
        ('mod-reservas', 'reservas', 'Gestión de Reservas', 'Administra reservas online', 'Calendar', '#f59e0b', '/restaurant/reservations', true, 3, NOW(), NOW()),
        ('mod-reservas-pro', 'reservas-pro', 'Reservas Profesional', 'Gestión avanzada de reservas', 'CalendarDays', '#8b5cf6', '/restaurant/reservations-pro', true, 4, NOW(), NOW()),
        ('mod-valoraciones', 'valoraciones', 'Valoraciones', 'Valora a tus clientes', 'Heart', '#ef4444', '/restaurant/ratings', true, 5, NOW(), NOW()),
        ('mod-config', 'config', 'Configuración', 'Ajustes del restaurante', 'Settings', '#64748b', '/restaurant/config', true, 6, NOW(), NOW()),
        ('mod-config-pro', 'config-pro', 'Configuración Pro', 'Ajustes avanzados', 'Settings', '#7c3aed', '/restaurant/config-pro', true, 7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        route = EXCLUDED.route,
        is_active = EXCLUDED.is_active,
        display_order = EXCLUDED.display_order,
        updated_at = NOW()
    `);

    console.log('📋 Actualizando planes de suscripción con módulos correctos...');
    
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = '["mod-mesas","mod-horarios","mod-reservas","mod-config"]'
      WHERE id = 'plan-basico'
    `);

    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = '["mod-mesas","mod-horarios","mod-reservas","mod-reservas-pro","mod-valoraciones","mod-config","mod-config-pro"]'
      WHERE id = 'plan-pro'
    `);

    console.log('📋 Verificando módulos insertados...');
    const verify = await client.query(`SELECT * FROM modules ORDER BY display_order`);
    console.log(`✅ ${verify.rows.length} módulos en la base de datos:`);
    verify.rows.forEach((row: any) => {
      console.log(`   • ${row.name} (${row.id}) - ${row.icon} ${row.color}`);
    });

    console.log('\n✅ Esquema de módulos arreglado correctamente');
    console.log('✅ Módulos actualizados con iconos y colores');
    console.log('✅ Planes de suscripción actualizados');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixModulesSchema();
