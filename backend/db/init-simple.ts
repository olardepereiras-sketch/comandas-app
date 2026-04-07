#!/usr/bin/env bun
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no configurada');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function initDatabase() {
  console.log('🔹 Iniciando base de datos con datos mínimos...\n');

  try {
    await pool.query('DELETE FROM provinces CASCADE');
    console.log('✅ Provincias eliminadas');

    const provinciaId = 'prov-pontevedra';
    await pool.query(
      'INSERT INTO provinces (id, name, created_at) VALUES ($1, $2, $3)',
      [provinciaId, 'Pontevedra', new Date()]
    );
    console.log('✅ Provincia "Pontevedra" creada');

    const ciudadId = 'city-vigo';
    await pool.query(
      'INSERT INTO cities (id, name, province_id, created_at) VALUES ($1, $2, $3, $4)',
      [ciudadId, 'Vigo', provinciaId, new Date()]
    );
    console.log('✅ Ciudad "Vigo" creada');

    const restaurantId = 'rest-demo';
    const slug = 'restaurante-demo';
    const now = new Date();
    const subscriptionExpiry = new Date();
    subscriptionExpiry.setFullYear(subscriptionExpiry.getFullYear() + 1);

    await pool.query(
      `INSERT INTO restaurants (
        id, name, description, username, password, profile_image_url, google_maps_url,
        cuisine_type, address, postal_code, city_id, province_id, phone, email, 
        slug, image_url, is_active, subscription_plan_id, subscription_expiry,
        enabled_modules, advance_booking_days, custom_links, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        restaurantId,
        'Restaurante Demo',
        'Restaurante de demostración',
        'demo',
        'demo123',
        null,
        null,
        JSON.stringify(['gallega', 'mediterranea']),
        'Calle Principal 123',
        '36001',
        ciudadId,
        provinciaId,
        JSON.stringify(['+34 986 123 456']),
        'demo@restaurante.com',
        slug,
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        true,
        null,
        subscriptionExpiry,
        JSON.stringify(['info-config', 'reservations', 'table-management']),
        30,
        JSON.stringify([]),
        now,
        now,
      ]
    );
    console.log('✅ Restaurante "Restaurante Demo" creado');
    console.log(`   URL: http://200.234.236.133/restaurant/login/${slug}`);
    console.log(`   Usuario: demo`);
    console.log(`   Contraseña: demo123`);

    const ubicacionId = 'loc-salon';
    await pool.query(
      'INSERT INTO table_locations (id, restaurant_id, name, slug, order_num, created_at, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [ubicacionId, restaurantId, 'Salón Principal', 'salon-principal', 1, now, true]
    );
    console.log('✅ Ubicación "Salón Principal" creada');

    const mesaId = 'table-1';
    await pool.query(
      `INSERT INTO tables (id, location_id, restaurant_id, name, min_capacity, max_capacity, 
       allows_high_chairs, allows_strollers, allows_pets, order_num, created_at, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [mesaId, ubicacionId, restaurantId, 'Mesa 1', 2, 4, true, true, true, 1, now, true]
    );
    console.log('✅ Mesa "Mesa 1" creada');

    await pool.query('DELETE FROM admin_users');
    const adminId = 'admin-1';
    await pool.query(
      'INSERT INTO admin_users (id, username, password, email, created_at) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'admin', 'admin123', 'admin@reservamesa.com', now]
    );
    console.log('✅ Usuario admin creado');
    console.log(`   Usuario: admin`);
    console.log(`   Contraseña: admin123`);

    console.log('\n✅ Base de datos inicializada correctamente');
    console.log('\n📌 URLs de acceso:');
    console.log(`   Admin: http://200.234.236.133/admin/login`);
    console.log(`   Restaurante: http://200.234.236.133/restaurant/login/${slug}`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDatabase().catch(console.error);
