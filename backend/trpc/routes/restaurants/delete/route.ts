import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteRestaurantProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE RESTAURANT] Eliminando restaurante:', input.id);

    try {
      await ctx.db.query(
        'DELETE FROM reservations WHERE restaurant_id = $1',
        [input.id]
      );

      await ctx.db.query(
        'DELETE FROM tables WHERE restaurant_id = $1',
        [input.id]
      );

      await ctx.db.query(
        'DELETE FROM table_locations WHERE restaurant_id = $1',
        [input.id]
      );

      const result = await ctx.db.query(
        'DELETE FROM restaurants WHERE id = $1',
        [input.id]
      );

      console.log('✅ [DELETE RESTAURANT] Restaurante eliminado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }

      return { success: true, id: input.id };
    } catch (error: any) {
      console.error('❌ [DELETE RESTAURANT] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar el restaurante: ${error.message}`,
      });
    }
  });
