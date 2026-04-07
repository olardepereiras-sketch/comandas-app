import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getGameNotificationsProcedure = publicProcedure
  .input(z.object({ restaurantId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🎮 [GAME NOTIFICATIONS] Getting for restaurant:', input.restaurantId);
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS game_notifications (
          id SERIAL PRIMARY KEY,
          restaurant_id VARCHAR(255) NOT NULL,
          username VARCHAR(100) NOT NULL,
          score INTEGER NOT NULL,
          position INTEGER NOT NULL,
          achieved_at VARCHAR(50) NOT NULL,
          dismissed BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      const result = await ctx.db.query(
        `SELECT id, username, score, position, achieved_at FROM game_notifications
         WHERE restaurant_id = $1 AND dismissed = false
         ORDER BY created_at DESC LIMIT 20`,
        [input.restaurantId]
      );

      return result.rows.map((r: any) => ({
        id: r.id as number,
        username: r.username as string,
        score: r.score as number,
        position: r.position as number,
        achievedAt: r.achieved_at as string,
      }));
    } catch (error: any) {
      console.error('❌ [GAME NOTIFICATIONS] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error al obtener notificaciones: ${error.message}` });
    }
  });
