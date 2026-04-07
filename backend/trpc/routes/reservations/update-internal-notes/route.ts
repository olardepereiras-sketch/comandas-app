import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const updateReservationInternalNotesProcedure = publicProcedure
  .input(
    z.object({
      reservationId: z.string(),
      internalNotes: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE INTERNAL NOTES] Actualizando nota interna:', input.reservationId);

    try {
      await ctx.db.query(
        `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS internal_notes TEXT`
      );
    } catch {
      // column may already exist
    }

    await ctx.db.query(
      `UPDATE reservations SET internal_notes = $1, updated_at = NOW() WHERE id = $2`,
      [input.internalNotes.trim() || null, input.reservationId]
    );

    console.log('✅ [UPDATE INTERNAL NOTES] Nota interna actualizada');
    return { success: true };
  });
