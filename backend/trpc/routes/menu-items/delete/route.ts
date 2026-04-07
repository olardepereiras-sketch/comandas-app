import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteMenuItemProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE MENU ITEM]', input.id);
    await ctx.db.query(`DELETE FROM menu_items WHERE id = $1`, [input.id]);
    console.log('✅ [DELETE MENU ITEM]', input.id);
    return { success: true };
  });
