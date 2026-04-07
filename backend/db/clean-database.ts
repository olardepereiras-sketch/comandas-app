import { createClient } from '@libsql/client';

console.log('🧹 Limpiando base de datos Turso...');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ Error: Faltan variables de entorno TURSO_DATABASE_URL o TURSO_AUTH_TOKEN');
  process.exit(1);
}

const db = createClient({
  url,
  authToken,
});

async function cleanDatabase() {
  try {
    console.log('✅ Conexión establecida con Turso');
    console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de TODAS las tablas');
    console.log('⏳ Esperando 3 segundos antes de continuar...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const tables = [
      'client_ratings',
      'reservations',
      'day_schedules',
      'weekly_schedules',
      'shift_groups',
      'table_groups',
      'tables',
      'table_locations',
      'rating_criteria',
      'restaurants',
      'cities',
      'provinces',
      'clients',
      'subscription_durations',
      'subscription_plans',
    ];

    console.log('\n🔄 Eliminando datos de todas las tablas...\n');

    for (const table of tables) {
      try {
        const result = await db.execute(`DELETE FROM ${table}`);
        console.log(`  ✓ ${table}: ${result.rowsAffected} filas eliminadas`);
      } catch (error: any) {
        if (error.message.includes('no such table')) {
          console.log(`  ⚠️  ${table}: tabla no existe (omitiendo)`);
        } else {
          console.error(`  ❌ ${table}: error - ${error.message}`);
        }
      }
    }

    console.log('\n✅ Limpieza completada');
    console.log('🎉 Base de datos limpia - Puedes ejecutar seed.ts para crear datos iniciales');
    console.log('\n💡 Para volver a crear el usuario admin, ejecuta:');
    console.log('   bun backend/db/seed.ts');

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanDatabase();
