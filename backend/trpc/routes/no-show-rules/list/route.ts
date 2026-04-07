import { publicProcedure } from '../../../create-context';

export const listNoShowRulesProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [NO SHOW RULES] Obteniendo reglas de no shows');

    const result = await ctx.db.query(`
      SELECT id, no_shows_required, block_days, message, is_active, created_at, updated_at
      FROM no_show_rules
      WHERE is_active = true
      ORDER BY no_shows_required ASC
    `);

    const rules = result.rows.map(row => ({
      id: row.id,
      noShowCount: row.no_shows_required,
      blockDays: row.block_days,
      message: row.message,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`✅ [NO SHOW RULES] ${rules.length} reglas encontradas`);

    return rules;
  });
