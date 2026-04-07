import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

async function fixDepositsAndAdminStripe() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📋 1. Creando tabla admin_stripe_config...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_stripe_config (
        id VARCHAR(255) PRIMARY KEY DEFAULT 'admin-stripe-config',
        stripe_secret_key TEXT,
        stripe_publishable_key TEXT,
        stripe_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query(`
      INSERT INTO admin_stripe_config (id, stripe_enabled)
      VALUES ('admin-stripe-config', FALSE)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Tabla admin_stripe_config creada');
    
    console.log('📋 2. Obteniendo planes de suscripción...');
    const plansResult = await client.query(
      'SELECT id, name, enabled_modules FROM subscription_plans'
    );
    
    console.log(`✅ Encontrados ${plansResult.rows.length} planes`);
    
    for (const plan of plansResult.rows) {
      console.log(`\n📦 Procesando plan: ${plan.name} (${plan.id})`);
      
      let enabledModules: string[] = [];
      if (plan.enabled_modules) {
        if (typeof plan.enabled_modules === 'string') {
          enabledModules = JSON.parse(plan.enabled_modules);
        } else if (Array.isArray(plan.enabled_modules)) {
          enabledModules = plan.enabled_modules;
        }
      }
      
      console.log('   Módulos actuales:', enabledModules);
      
      if (!enabledModules.includes('deposits')) {
        enabledModules.push('deposits');
        console.log('   ➕ Agregando módulo "deposits"');
        
        await client.query(
          'UPDATE subscription_plans SET enabled_modules = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(enabledModules), plan.id]
        );
        
        console.log('   ✅ Módulo "deposits" agregado al plan:', plan.name);
      } else {
        console.log('   ✓ El plan ya tiene el módulo "deposits"');
      }
    }
    
    console.log('\n📋 3. Verificando que el módulo existe en la tabla modules...');
    const moduleCheck = await client.query(
      "SELECT * FROM modules WHERE id = 'deposits'"
    );
    
    if (moduleCheck.rows.length === 0) {
      console.log('   ➕ Creando módulo "deposits"...');
      await client.query(`
        INSERT INTO modules (id, name, description, icon, color, route, display_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        'deposits',
        'Fianzas',
        'Sistema de cobro de fianzas por reserva con Stripe',
        'DollarSign',
        '#10b981',
        '/restaurant/deposits',
        8,
        true
      ]);
      console.log('   ✅ Módulo "deposits" creado');
    } else {
      console.log('   ✓ El módulo "deposits" ya existe');
    }
    
    await client.query('COMMIT');
    console.log('\n✅ ¡Todo completado exitosamente!');
    
    console.log('\n📊 Estado final de los planes:');
    const finalPlans = await client.query(
      'SELECT id, name, enabled_modules FROM subscription_plans ORDER BY id'
    );
    
    for (const plan of finalPlans.rows) {
      let modules: string[] = [];
      if (plan.enabled_modules) {
        if (typeof plan.enabled_modules === 'string') {
          modules = JSON.parse(plan.enabled_modules);
        } else if (Array.isArray(plan.enabled_modules)) {
          modules = plan.enabled_modules;
        }
      }
      console.log(`\n   ${plan.name} (${plan.id}):`);
      console.log(`   Módulos: ${modules.join(', ')}`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDepositsAndAdminStripe().catch(console.error);
