import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function addComandasProModule() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Agregando módulo Comandas Pro...');
    
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
    `, [
      'comandas-pro',
      'Comandas Pro',
      'Sistema de comandas avanzado: 2 monitores de cocina, 2 PC/Caja, 3 comanderas',
      'ClipboardList',
      '#8b5cf6',
      '/restaurant/comandas',
      11,
      true
    ]);
    
    console.log('✅ Módulo Comandas Pro agregado');

    console.log('\n📋 Módulos actuales en la base de datos:');
    const result = await pool.query(`SELECT id, name, route, display_order, is_active FROM modules ORDER BY display_order ASC`);
    result.rows.forEach((row: any) => {
      console.log(`  - [${row.display_order}] ${row.name} (${row.id}) → ${row.route} | activo: ${row.is_active}`);
    });
    
    console.log('\n✅ Módulo Comandas Pro agregado exitosamente');
    console.log('💡 Para asignarlo a planes de suscripción, edita los planes desde el panel de administración.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addComandasProModule().catch(console.error);
