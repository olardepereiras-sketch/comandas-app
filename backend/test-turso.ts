import { createClient } from '@libsql/client';

console.log('🧪 Test de conexión a Turso\n');
console.log('=' .repeat(60));

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log('\n📋 Verificando variables de entorno:');
console.log(`   TURSO_DATABASE_URL: ${url ? '✅ Presente' : '❌ FALTA'}`);
console.log(`   TURSO_AUTH_TOKEN: ${authToken ? '✅ Presente' : '❌ FALTA'}`);

if (url) {
  console.log(`   URL preview: ${url.substring(0, 50)}...`);
}

if (authToken) {
  console.log(`   Token preview: ${authToken.substring(0, 20)}...${authToken.substring(authToken.length - 10)}`);
  console.log(`   Token length: ${authToken.length} caracteres`);
  
  if (authToken.includes('"') || authToken.includes("'")) {
    console.log('   ⚠️ ADVERTENCIA: El token contiene comillas. Esto causará errores.');
  }
  if (authToken.includes(' ')) {
    console.log('   ⚠️ ADVERTENCIA: El token contiene espacios. Esto causará errores.');
  }
  if (authToken.includes('\n')) {
    console.log('   ⚠️ ADVERTENCIA: El token contiene saltos de línea. Esto causará errores.');
  }
  if (authToken.startsWith('Bearer ')) {
    console.log('   ⚠️ ADVERTENCIA: El token comienza con "Bearer". Esto causará errores.');
  }
}

if (!url || !authToken) {
  console.error('\n❌ Error: Faltan variables de entorno');
  console.error('   Por favor, verifica que el archivo .env esté configurado correctamente.');
  process.exit(1);
}

console.log('\n🔌 Intentando conectar a Turso...');

const db = createClient({
  url,
  authToken,
});

async function testConnection() {
  try {
    console.log('📡 Ejecutando query de prueba: SELECT 1');
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Conexión exitosa');
    console.log('📊 Resultado:', result.rows);

    console.log('\n📋 Verificando tabla provinces...');
    try {
      const provinces = await db.execute('SELECT COUNT(*) as count FROM provinces');
      console.log(`✅ Tabla provinces existe. Registros: ${provinces.rows[0].count}`);
    } catch (error: any) {
      console.error('❌ Error al consultar tabla provinces:', error.message);
    }

    console.log('\n📋 Verificando tabla cities...');
    try {
      const cities = await db.execute('SELECT COUNT(*) as count FROM cities');
      console.log(`✅ Tabla cities existe. Registros: ${cities.rows[0].count}`);
    } catch (error: any) {
      console.error('❌ Error al consultar tabla cities:', error.message);
    }

    console.log('\n📋 Verificando tabla restaurants...');
    try {
      const restaurants = await db.execute('SELECT COUNT(*) as count FROM restaurants');
      console.log(`✅ Tabla restaurants existe. Registros: ${restaurants.rows[0].count}`);
    } catch (error: any) {
      console.error('❌ Error al consultar tabla restaurants:', error.message);
    }

    console.log('\n📋 Listando todas las provincias:');
    try {
      const allProvinces = await db.execute('SELECT id, name FROM provinces');
      if (allProvinces.rows.length === 0) {
        console.log('   ⚠️ No hay provincias en la base de datos');
        console.log('   💡 Ejecuta: bun run backend/db/seed.ts');
      } else {
        allProvinces.rows.forEach((row: any) => {
          console.log(`   - ${row.name} (${row.id})`);
        });
      }
    } catch (error: any) {
      console.error('❌ Error al listar provincias:', error.message);
    }

    console.log('\n📋 Test de INSERT (provincia de prueba):');
    try {
      const testId = `test-province-${Date.now()}`;
      const insertResult = await db.execute({
        sql: 'INSERT INTO provinces (id, name, created_at) VALUES (?, ?, ?)',
        args: [testId, 'Test Province', Date.now()],
      });
      console.log(`✅ INSERT exitoso. Rows affected: ${insertResult.rowsAffected}`);
      
      console.log('🗑️ Limpiando provincia de prueba...');
      await db.execute({
        sql: 'DELETE FROM provinces WHERE id = ?',
        args: [testId],
      });
      console.log('✅ Limpieza completada');
    } catch (error: any) {
      console.error('❌ Error en test de INSERT:', error.message);
      console.error('   Stack:', error.stack);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Test completado exitosamente');
    console.log('✅ La base de datos está lista para usar');

  } catch (error: any) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Error durante el test de conexión:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    
    if (error.message.includes('authorization') || error.message.includes('auth')) {
      console.error('\n💡 SOLUCIÓN SUGERIDA:');
      console.error('   1. Verifica que el token NO tenga comillas');
      console.error('   2. Verifica que el token NO tenga espacios');
      console.error('   3. Verifica que el token NO tenga "Bearer" al principio');
      console.error('   4. El token debe ser una línea continua de ~200-300 caracteres');
      console.error('   5. Genera un nuevo token en https://turso.tech/');
    }
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.error('\n💡 SOLUCIÓN SUGERIDA:');
      console.error('   1. Verifica que la URL de la base de datos sea correcta');
      console.error('   2. Verifica que la base de datos exista en tu cuenta de Turso');
      console.error('   3. Ve a https://turso.tech/ y confirma el nombre de la BD');
    }
    
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
