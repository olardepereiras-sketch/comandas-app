import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateHighChairsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      availableHighChairs: z.number().min(0),
      highChairRotationMinutes: z.number().min(0),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE HIGH CHAIRS] Actualizando tronas:', input);
    
    await ctx.db.query(
      `UPDATE restaurants 
       SET available_high_chairs = $1, 
           high_chair_rotation_minutes = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [input.availableHighChairs, input.highChairRotationMinutes, input.restaurantId]
    );
    
    console.log('✅ [UPDATE HIGH CHAIRS] Configuración de tronas actualizada');
    
    return { success: true };
  });
