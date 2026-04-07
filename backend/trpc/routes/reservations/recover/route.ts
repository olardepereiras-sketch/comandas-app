import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const recoverReservationProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [RECOVER RESERVATION] Recuperando reserva:', input);

    const reservation = await ctx.db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [input.reservationId]
    );

    if (reservation.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }

    const reservationData = reservation.rows[0];

    if (reservationData.status !== 'cancelled') {
      throw new Error('Solo se pueden recuperar reservas anuladas');
    }

    if (reservationData.cancelled_by !== 'restaurant') {
      throw new Error('Solo se pueden recuperar reservas anuladas por el restaurante');
    }

    await ctx.db.query(
      `UPDATE reservations 
       SET status = $1, table_ids = $2, cancelled_by = $3, notes = $4, updated_at = $5
       WHERE id = $6`,
      [
        'pending',
        '[]',
        null,
        null,
        new Date(),
        input.reservationId,
      ]
    );

    console.log('✅ [RECOVER RESERVATION] Reserva recuperada exitosamente');

    return {
      success: true,
      message: 'Reserva recuperada correctamente',
    };
  });
