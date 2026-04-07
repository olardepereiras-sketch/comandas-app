#!/usr/bin/env bun
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DB_URL;
const token = process.env.TURSO_DB_TOKEN;

if (!url || !token) {
  console.error('❌ Faltan variables de entorno TURSO_DB_URL o TURSO_DB_TOKEN');
  console.error('ℹ️  Asegúrate de que el archivo .env existe y contiene:');
  console.error('   TURSO_DB_URL=libsql://...');
  console.error('   TURSO_DB_TOKEN=eyJ...');
  process.exit(1);
}

console.log('✅ Variables de entorno encontradas');
console.log(`🔗 Conectando a: ${url.substring(0, 40)}...`);

const client = createClient({ url, authToken: token });

async function checkAndAddColumn(
  table: string,
  columnDef: string,
  description: string
) {
  const colName = columnDef.split(' ')[0];
  try {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
    console.log(`✅ ${description}: ${colName}`);
    return true;
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log(`ℹ️  Ya existe: ${colName}`);
      return false;
    } else {
      console.error(`❌ Error añadiendo ${colName}:`, e.message);
      return false;
    }
  }
}

async function verifyTableStructure() {
  console.log('\n📋 Verificando estructura de tablas...\n');

  let changes = 0;

  // Verificar tabla restaurants
  console.log('🔍 Verificando tabla: restaurants');
  const restaurantColumns = [
    { def: "province_id TEXT", desc: "ID de provincia" },
    { def: "city_id TEXT", desc: "ID de ciudad" },
    { def: "profile_image_url TEXT", desc: "URL foto de perfil" },
    { def: "google_maps_url TEXT", desc: "URL Google Maps" },
    { def: "cuisine_type TEXT", desc: "Tipo de cocina (JSON)" },
    { def: "postal_code TEXT", desc: "Código postal" },
    { def: "phone TEXT", desc: "Teléfono (JSON array)" },
    { def: "email TEXT", desc: "Email" },
    { def: "slug TEXT", desc: "Slug para URL" },
    { def: "image_url TEXT", desc: "URL imagen principal" },
    { def: "username TEXT", desc: "Usuario de acceso" },
    { def: "password TEXT", desc: "Contraseña" },
    { def: "subscription_plan_id TEXT", desc: "ID plan de suscripción" },
    { def: "subscription_expiry TEXT", desc: "Fecha de expiración" },
    { def: "enabled_modules TEXT", desc: "Módulos habilitados (JSON)" },
    { def: "advance_booking_days INTEGER DEFAULT 30", desc: "Días anticipación reservas" },
    { def: "custom_links TEXT", desc: "Enlaces personalizados (JSON)" },
    { def: "owner_id TEXT", desc: "ID del propietario" },
    { def: "updated_at TEXT", desc: "Fecha actualización" },
    { def: "is_active INTEGER DEFAULT 1", desc: "Restaurante activo" },
  ];

  for (const { def, desc } of restaurantColumns) {
    const added = await checkAndAddColumn('restaurants', def, desc);
    if (added) changes++;
  }

  // Verificar tabla cities
  console.log('\n🔍 Verificando tabla: cities');
  const cityColumns = [
    { def: "province_id TEXT", desc: "ID de provincia (FK)" },
  ];

  for (const { def, desc } of cityColumns) {
    const added = await checkAndAddColumn('cities', def, desc);
    if (added) changes++;
  }

  return changes;
}

async function initializeExistingRestaurants() {
  console.log('\n🔧 Inicializando restaurantes existentes...');
  
  try {
    const result = await client.execute(`
      UPDATE restaurants 
      SET 
        subscription_expiry = '2030-01-01T00:00:00Z',
        is_active = 1,
        updated_at = datetime('now')
      WHERE subscription_expiry IS NULL
    `);
    
    if (result.rowsAffected > 0) {
      console.log(`✅ Inicializados ${result.rowsAffected} restaurantes`);
    } else {
      console.log('ℹ️  No hay restaurantes para inicializar');
    }
  } catch (e: any) {
    console.error('❌ Error inicializando restaurantes:', e.message);
  }
}

async function verifyConnection() {
  console.log('\n🔬 Verificando conexión a base de datos...');
  
  try {
    const result = await client.execute('SELECT 1 as test');
    console.log('✅ Conexión exitosa a Turso');
    return true;
  } catch (e: any) {
    console.error('❌ Error de conexión:', e.message);
    return false;
  }
}

async function showTableInfo() {
  console.log('\n📊 Información de tablas:\n');
  
  try {
    const tables = ['restaurants', 'cities', 'provinces'];
    
    for (const table of tables) {
      const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${table}: ${count} registros`);
    }
  } catch (e: any) {
    console.log('ℹ️  No se pudo obtener información de tablas');
  }
}

async function main() {
  console.log('🚀 Script de verificación y corrección de esquema de base de datos');
  console.log('═'.repeat(70));
  
  const connected = await verifyConnection();
  if (!connected) {
    process.exit(1);
  }

  await showTableInfo();

  const changes = await verifyTableStructure();

  await initializeExistingRestaurants();

  await showTableInfo();

  await client.close();

  console.log('\n' + '═'.repeat(70));
  if (changes > 0) {
    console.log(`✅ Proceso completado: ${changes} columnas añadidas`);
    console.log('ℹ️  Reinicia el servidor backend para aplicar los cambios');
    console.log('   pm2 restart quieromesa');
  } else {
    console.log('✅ Proceso completado: Base de datos ya está actualizada');
  }
  console.log('═'.repeat(70));
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
