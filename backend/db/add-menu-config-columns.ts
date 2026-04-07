import { Pool } from 'pg';

export async function addMenuConfigColumns(pool: Pool) {
  console.log('🔄 [DB MIGRATION] Agregando columnas de configuración a carta digital...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE digital_menus
      ADD COLUMN IF NOT EXISTS show_allergen_filter BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS show_dietary_filter BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS custom_characteristics JSONB NOT NULL DEFAULT '[]'
    `);
    console.log('✅ Columnas de configuración agregadas a digital_menus');

    await client.query('COMMIT');
    console.log('✅ [DB MIGRATION] Configuración de carta digital agregada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [DB MIGRATION] Error al agregar columnas de configuración:', error);
    throw error;
  } finally {
    client.release();
  }
}
