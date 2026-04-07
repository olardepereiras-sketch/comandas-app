import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteScheduleProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE SCHEDULE] Eliminando horario:', input.id);

    try {
      const result = await ctx.db.query(
        'DELETE FROM schedules WHERE id = $1',
        [input.id]
      );

      console.log('✅ [DELETE SCHEDULE] Horario eliminado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Horario no encontrado',
        });
      }

      return { success: true, id: input.id };
    } catch (error: any) {
      console.error('❌ [DELETE SCHEDULE] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar el horario: ${error.message}`,
      });
    }
  });
