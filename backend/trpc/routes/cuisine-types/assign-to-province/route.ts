import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const assignCuisineToProvinceProcedure = publicProcedure
  .input(
    z.object({
      provinceId: z.string(),
      cuisineTypeIds: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [ASSIGN CUISINE TO PROVINCE] Asignando tipos de cocina a provincia:', input.provinceId);

    await ctx.db.query(
      'DELETE FROM province_cuisine_types WHERE province_id = $1',
      [input.provinceId]
    );

    for (const cuisineTypeId of input.cuisineTypeIds) {
      await ctx.db.query(
        `INSERT INTO province_cuisine_types (id, province_id, cuisine_type_id, created_at)
         VALUES ($1, $2, $3, $4)`,
        [`pct-${Date.now()}-${Math.random().toString(36).substring(7)}`, input.provinceId, cuisineTypeId, new Date()]
      );
    }

    console.log('✅ [ASSIGN CUISINE TO PROVINCE] Tipos de cocina asignados');

    return { success: true };
  });
