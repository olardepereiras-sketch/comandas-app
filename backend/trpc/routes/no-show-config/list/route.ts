import { publicProcedure } from '../../../create-context';

export const listNoShowConfigProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [NO SHOW CONFIG] Obteniendo configuración de no shows');

    const result = await ctx.db.query(`
      SELECT id, occurrence, block_days, message, created_at, updated_at
      FROM no_show_config
      ORDER BY occurrence ASC
    `);

    const configs = result.rows.map(row => ({
      id: row.id,
      occurrence: row.occurrence,
      blockDays: row.block_days,
      message: row.message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`✅ [NO SHOW CONFIG] ${configs.length} configuraciones encontradas`);

    return configs;
  });
