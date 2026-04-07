import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteSalesRepProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE SALES REP] Eliminando comercial:', input.id);

    try {
      const checkResult = await ctx.db.query(
        'SELECT COUNT(*) as count FROM restaurants WHERE sales_rep_id = $1',
        [input.id]
      );

      const restaurantCount = parseInt(checkResult.rows[0]?.count || '0');
      
      if (restaurantCount > 0) {
        throw new Error(`No se puede eliminar el comercial porque tiene ${restaurantCount} restaurante(s) asignado(s)`);
      }

      const result = await ctx.db.query(
        'DELETE FROM sales_representatives WHERE id = $1',
        [input.id]
      );

      if (result.rowCount === 0) {
        throw new Error('Comercial no encontrado');
      }

      console.log('✅ [DELETE SALES REP] Comercial eliminado:', input.id);
      return { success: true };
    } catch (error: any) {
      console.error('❌ [DELETE SALES REP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Error al eliminar comercial',
      });
    }
  });
