import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteReservationProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
      confirmed: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE RESERVATION] Eliminando reserva:', input.reservationId);

    const reservationResult = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    await ctx.db.query(
      'DELETE FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    console.log('✅ [DELETE RESERVATION] Reserva eliminada correctamente');

    return { success: true };
  });
