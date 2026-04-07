import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const cleanupTemporaryTablesProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CLEANUP TEMP TABLES] Limpiando mesas temporales para reserva:', input.reservationId);
    
    try {
      await ctx.db.query(
        'DELETE FROM temporary_tables WHERE reservation_id = $1',
        [input.reservationId]
      );
      console.log('✅ [CLEANUP TEMP TABLES] Mesas temporales eliminadas');

      await ctx.db.query(
        'DELETE FROM table_blocks_for_split WHERE reservation_id = $1',
        [input.reservationId]
      );
      console.log('✅ [CLEANUP TEMP TABLES] Bloqueos de mesa eliminados');

      return { success: true };
    } catch (error: any) {
      console.error('❌ [CLEANUP TEMP TABLES] Error:', error);
      throw new Error(`Error limpiando mesas temporales: ${error.message}`);
    }
  });
