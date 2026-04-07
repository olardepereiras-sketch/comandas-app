import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteTimeSlotProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE TIME SLOT] Eliminando hora:', input.id);
    
    const timeSlotResult = await ctx.db.query(
      'SELECT * FROM time_slots WHERE id = $1',
      [input.id]
    );
    
    if (timeSlotResult.rows.length === 0) {
      throw new Error('Hora no encontrada');
    }

    await ctx.db.query(
      'DELETE FROM time_slots WHERE id = $1',
      [input.id]
    );
    
    console.log('✅ [DELETE TIME SLOT] Hora eliminada');
    
    return { success: true };
  });
