import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listShiftTemplatesProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST SHIFT TEMPLATES] Listando plantillas:', input.restaurantId);

    const result = await ctx.db.query(
      'SELECT * FROM shift_templates WHERE restaurant_id = $1 ORDER BY name',
      [input.restaurantId]
    );

    const templates = result.rows.map((row: any) => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      name: row.name,
      times: JSON.parse(row.times || '[]'),
      startTime: row.start_time,
      endTime: row.end_time,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    console.log('✅ [LIST SHIFT TEMPLATES] Plantillas listadas:', templates.length);
    return templates;
  });
