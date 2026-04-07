import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteTableGroupProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE TABLE GROUP] Eliminando grupo de mesas:', input);
    
    await ctx.db.query('DELETE FROM table_groups WHERE id = $1', [input.id]);
    
    console.log('✅ [DELETE TABLE GROUP] Grupo eliminado:', input.id);
    
    return { success: true };
  });
