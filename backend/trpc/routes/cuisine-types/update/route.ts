import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateCuisineTypeProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE CUISINE TYPE] Actualizando tipo de cocina:', input.id);

    await ctx.db.query(
      `UPDATE cuisine_types 
       SET name = $1
       WHERE id = $2`,
      [input.name, input.id]
    );

    console.log('✅ [UPDATE CUISINE TYPE] Tipo de cocina actualizado');

    return {
      id: input.id,
      name: input.name,
    };
  });
