import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://reservamesa_user:reservamesa2024@localhost/reservamesa';
const pool = new Pool({ connectionString });

async function fixDepositsModule() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Verificando módulos de fianzas...');
    
    const existingModules = await pool.query(`
      SELECT id, name, route FROM modules 
      WHERE id LIKE '%fianza%' OR id LIKE '%deposit%' OR name ILIKE '%fianza%'
      ORDER BY id
    `);
    
    console.log('📦 Módulos encontrados:', existingModules.rows);
    
    console.log('🗑️ Eliminando módulos duplicados...');
    await pool.query(`DELETE FROM modules WHERE id IN ('deposits', 'fianzas-2', 'fianzas-1')`);
    
    console.log('✅ Creando módulo único de fianzas...');
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
      'deposits',
      'Fianzas',
      'Sistema de cobro de fianzas por reserva con Stripe',
      'ShoppingCart',
      '#10b981',
      '/restaurant/deposits',
      8,
      true
    ]);
    
    console.log('✅ Módulo de fianzas configurado correctamente');
    
    const finalModules = await pool.query(`
      SELECT id, name, route FROM modules 
      WHERE id = 'deposits'
    `);
    
    console.log('✅ Verificación final:', finalModules.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

fixDepositsModule().catch(console.error);
