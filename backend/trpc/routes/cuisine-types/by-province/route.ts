import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const cuisineTypesByProvinceProcedure = publicProcedure
  .input(
    z.object({
      provinceId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [CUISINE TYPES BY PROVINCE] Obteniendo tipos de cocina para provincia:', input.provinceId);

    const result = await ctx.db.query(`
      SELECT ct.id, ct.name
      FROM cuisine_types ct
      INNER JOIN province_cuisine_types pct ON ct.id = pct.cuisine_type_id
      WHERE pct.province_id = $1
      ORDER BY ct.name ASC
    `, [input.provinceId]);

    const cuisineTypes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
    }));

    console.log(`✅ [CUISINE TYPES BY PROVINCE] ${cuisineTypes.length} tipos encontrados`);

    return cuisineTypes;
  });
