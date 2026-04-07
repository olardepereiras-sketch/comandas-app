import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function addDepositsModule() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('📋 Agregando módulo de fianzas...');
    
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
      'fianzas',
      'Fianzas',
      'Sistema de cobro de fianzas por reserva con Stripe',
      'ShoppingCart',
      '#14b8a6',
      '/restaurant/deposits',
      8,
      true
    ]);
    
    console.log('✅ Módulo de fianzas agregado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addDepositsModule().catch(console.error);
