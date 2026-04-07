import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const submitGameScoreProcedure = publicProcedure
  .input(z.object({
    username: z.string().min(1).max(100),
    score: z.number().int().min(0),
    restaurantId: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🎮 [GAME SUBMIT] Submitting score:', input.username, input.score, 'restaurant:', input.restaurantId);
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS game_ranking (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          date VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(username)
        )
      `);

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

      const now = new Date();
      const date = now.toLocaleDateString('es-ES');
      const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const achievedAt = `${date} a las ${time}`;

      await ctx.db.query(
        `INSERT INTO game_ranking (username, score, date, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (username) DO UPDATE
           SET score = GREATEST(game_ranking.score, EXCLUDED.score),
               date = CASE WHEN EXCLUDED.score > game_ranking.score THEN EXCLUDED.date ELSE game_ranking.date END,
               updated_at = NOW()`,
        [input.username, input.score, date]
      );

      const rankResult = await ctx.db.query(
        `SELECT COUNT(*) as cnt FROM game_ranking WHERE score > $1`,
        [input.score]
      );
      const position = parseInt(rankResult.rows[0].cnt, 10);

      const allResult = await ctx.db.query(
        `SELECT username, score, date FROM game_ranking ORDER BY score DESC LIMIT 20`
      );

      if (input.restaurantId && position < 10) {
        console.log('🏆 [GAME SUBMIT] Prize winner! Position:', position, 'for restaurant:', input.restaurantId);
        await ctx.db.query(
          `INSERT INTO game_notifications (restaurant_id, username, score, position, achieved_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [input.restaurantId, input.username, input.score, position, achievedAt]
        );
        console.log('✅ [GAME SUBMIT] Notification created for restaurant');
      }

      console.log('✅ [GAME SUBMIT] Score saved, position:', position);
      return {
        position,
        ranking: allResult.rows as Array<{ username: string; score: number; date: string }>,
        achievedAt,
      };
    } catch (error: any) {
      console.error('❌ [GAME SUBMIT] Error submitting score:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al guardar puntuación: ${error.message}`,
      });
    }
  });
