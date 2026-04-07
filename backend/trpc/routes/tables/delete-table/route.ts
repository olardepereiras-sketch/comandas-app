import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteTableProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE TABLE] Eliminando mesa:', input.id);
    
    try {
      const result = await ctx.db.query(
        'DELETE FROM tables WHERE id = $1',
        [input.id]
      );
      
      console.log('✅ [DELETE TABLE] DELETE exitoso. Rows affected:', result.rowCount);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ [DELETE TABLE] Error en DELETE:', error);
      throw error;
    }
  });
