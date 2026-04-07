import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanCuisineTypes() {
  console.log('🧹 [CLEAN] Limpiando tabla de tipos de cocina...');

  try {
    await pool.query('DELETE FROM province_cuisine_types');
    console.log('✅ [CLEAN] Asignaciones provincia-cocina eliminadas');

    await pool.query('DELETE FROM cuisine_types');
    console.log('✅ [CLEAN] Todos los tipos de cocina eliminados');

    await pool.query(`
      UPDATE restaurants 
      SET cuisine_type = '[]'::jsonb
    `);
    console.log('✅ [CLEAN] Tipos de cocina de restaurantes limpiados');

    console.log('✅ [CLEAN] Tabla de tipos de cocina completamente limpia');
  } catch (error) {
    console.error('❌ [CLEAN] Error limpiando tipos de cocina:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanCuisineTypes();
