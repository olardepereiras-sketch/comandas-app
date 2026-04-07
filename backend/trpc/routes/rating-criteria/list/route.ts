import { publicProcedure } from '../../../create-context';

export const listRatingCriteriaProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [RATING CRITERIA] Obteniendo criterios de valoración');

    const result = await ctx.db.query(`
      SELECT id, name, description, default_value, is_special_criteria, 
             is_active, order_num, created_at, updated_at
      FROM rating_criteria
      WHERE is_active = true
      ORDER BY order_num ASC
    `);

    const criteria = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      defaultValue: row.default_value,
      isSpecialCriteria: row.is_special_criteria,
      isActive: row.is_active,
      order: row.order_num,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    console.log(`✅ [RATING CRITERIA] ${criteria.length} criterios encontrados`);

    return criteria;
  });
