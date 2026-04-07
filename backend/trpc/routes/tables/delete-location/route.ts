import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteTableLocationProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE TABLE LOCATION] Eliminando ubicación:', input.id);
    
    try {
      const result = await ctx.db.query(
        'DELETE FROM table_locations WHERE id = $1',
        [input.id]
      );
      
      console.log('✅ [DELETE TABLE LOCATION] DELETE exitoso. Rows affected:', result.rowCount);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ [DELETE TABLE LOCATION] Error en DELETE:', error);
      throw error;
    }
  });
