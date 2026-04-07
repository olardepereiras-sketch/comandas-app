import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteModuleProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE MODULE] Eliminando módulo:', input.id);

    try {
      const result = await ctx.db.query(
        'DELETE FROM modules WHERE id = $1',
        [input.id]
      );

      console.log('✅ [DELETE MODULE] Módulo eliminado:', {
        id: input.id,
        rowsAffected: result.rowCount,
      });

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Módulo no encontrado',
        });
      }

      return { success: true, id: String(input.id) };
    } catch (error: any) {
      console.error('❌ [DELETE MODULE] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al eliminar el módulo: ${error.message}`,
      });
    }
  });
