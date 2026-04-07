import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const toggleNoShowProcedure = publicProcedure
  .input(
    z.object({
      noShowId: z.string(),
      isActive: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [TOGGLE NO SHOW] Cambiando estado del no show:', input.noShowId, 'a', input.isActive);

    const deactivatedAt = input.isActive ? null : new Date();

    await ctx.db.query(
      `UPDATE client_no_shows 
       SET is_active = $1, deactivated_at = $2
       WHERE id = $3`,
      [input.isActive, deactivatedAt, input.noShowId]
    );

    if (!input.isActive) {
      const noShowResult = await ctx.db.query(
        `SELECT client_id FROM client_no_shows WHERE id = $1`,
        [input.noShowId]
      );

      if (noShowResult.rows.length > 0) {
        const clientId = noShowResult.rows[0].client_id;

        const activeNoShowsResult = await ctx.db.query(
          `SELECT COUNT(*) as count FROM client_no_shows WHERE client_id = $1 AND is_active = true`,
          [clientId]
        );

        const activeCount = parseInt(activeNoShowsResult.rows[0].count);

        if (activeCount === 0) {
          await ctx.db.query(
            `UPDATE clients 
             SET is_blocked = false, blocked_until = NULL, updated_at = $1
             WHERE id = $2`,
            [new Date(), clientId]
          );
          console.log('✅ Cliente desbloqueado por no tener no shows activos');
        }
      }
    }

    console.log('✅ [TOGGLE NO SHOW] Estado actualizado correctamente');

    return { success: true };
  });
