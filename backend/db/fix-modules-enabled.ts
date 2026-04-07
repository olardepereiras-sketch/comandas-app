import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
});

async function fixModulesEnabled() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ARREGLANDO MÓDULOS HABILITADOS...\n');
    
    console.log('📋 1. Verificando módulos en base de datos...');
    const modulesResult = await client.query(`
      SELECT id, name, is_active 
      FROM modules 
      ORDER BY display_order
    `);
    
    console.log(`✅ Módulos encontrados: ${modulesResult.rows.length}`);
    modulesResult.rows.forEach((m: any) => {
      console.log(`   • ${m.id} - ${m.name} (activo: ${m.is_active})`);
    });
    
    console.log('\n📋 2. Verificando planes de suscripción...');
    const plansResult = await client.query(`
      SELECT id, name, enabled_modules 
      FROM subscription_plans
    `);
    
    console.log(`✅ Planes encontrados: ${plansResult.rows.length}`);
    plansResult.rows.forEach((p: any) => {
      const modules = Array.isArray(p.enabled_modules) ? p.enabled_modules : JSON.parse(p.enabled_modules || '[]');
      console.log(`   • ${p.name}: ${modules.length} módulos`);
      modules.forEach((m: string) => console.log(`     - ${m}`));
    });
    
    console.log('\n📋 3. Actualizando planes con módulos correctos...');
    
    const basicModules = ['info-config', 'reservations', 'table-management', 'schedules'];
    const proModules = ['info-config', 'config-pro', 'reservations', 'reservations-pro', 'table-management', 'schedules', 'client-ratings'];
    
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1 
      WHERE name = 'Plan Básico'
    `, [JSON.stringify(basicModules)]);
    console.log(`✅ Plan Básico actualizado con ${basicModules.length} módulos`);
    
    await client.query(`
      UPDATE subscription_plans 
      SET enabled_modules = $1 
      WHERE name = 'Plan Profesional'
    `, [JSON.stringify(proModules)]);
    console.log(`✅ Plan Profesional actualizado con ${proModules.length} módulos`);
    
    console.log('\n📋 4. Verificando restaurantes...');
    const restaurantsResult = await client.query(`
      SELECT r.id, r.name, r.subscription_plan_id, sp.name as plan_name, sp.enabled_modules
      FROM restaurants r
      LEFT JOIN subscription_plans sp ON r.subscription_plan_id = sp.id
    `);
    
    console.log(`✅ Restaurantes encontrados: ${restaurantsResult.rows.length}`);
    restaurantsResult.rows.forEach((r: any) => {
      const modules = r.enabled_modules ? 
        (Array.isArray(r.enabled_modules) ? r.enabled_modules : JSON.parse(r.enabled_modules || '[]')) : [];
      console.log(`   • ${r.name}`);
      console.log(`     Plan: ${r.plan_name || 'Sin plan'}`);
      console.log(`     Módulos: ${modules.join(', ')}`);
    });
    
    console.log('\n✅ ARREGLO COMPLETADO');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixModulesEnabled().catch(console.error);
