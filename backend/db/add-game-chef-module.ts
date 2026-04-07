import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function addGameChefModule() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    console.log('🎮 Agregando módulo: El Juego del Chef...');
    
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
      'game-chef',
      'El Juego del Chef',
      'Juego interactivo para clientes: trivia gastronómica, memory de platos y ranking con premios',
      'Gamepad2',
      '#f59e0b',
      '/restaurant/game-chef',
      11,
      true
    ]);
    
    console.log('✅ Módulo El Juego del Chef agregado');

    console.log('\n📋 Módulos actuales en la base de datos:');
    const result = await pool.query(`SELECT id, name, route, display_order, is_active FROM modules ORDER BY display_order ASC`);
    result.rows.forEach((row: any) => {
      console.log(`  - [${row.display_order}] ${row.name} (${row.id}) → ${row.route} | activo: ${row.is_active}`);
    });
    
    console.log('\n✅ Módulo El Juego del Chef agregado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addGameChefModule().catch(console.error);
