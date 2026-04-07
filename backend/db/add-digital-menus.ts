import { Pool } from 'pg';

export async function addDigitalMenus(pool: Pool) {
  console.log('🔄 [DB MIGRATION] Agregando sistema de carta digital...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS digital_menus (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#0EA5E9',
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla digital_menus creada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id TEXT PRIMARY KEY,
        menu_id TEXT NOT NULL REFERENCES digital_menus(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        color TEXT NOT NULL DEFAULT '#0EA5E9',
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla menu_categories creada');

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        allergens JSONB NOT NULL DEFAULT '[]',
        price2_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        price2_name TEXT,
        price2_amount DECIMAL(10,2),
        price3_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        price3_name TEXT,
        price3_amount DECIMAL(10,2),
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabla menu_items creada');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_digital_menus_restaurant_id ON digital_menus(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_menu_categories_menu_id ON menu_categories(menu_id);
      CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
    `);
    console.log('✅ Índices creados');

    await client.query('COMMIT');
    console.log('✅ [DB MIGRATION] Sistema de carta digital agregado exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DB MIGRATION] Error al agregar carta digital:', error);
    throw error;
  } finally {
    client.release();
  }
}
