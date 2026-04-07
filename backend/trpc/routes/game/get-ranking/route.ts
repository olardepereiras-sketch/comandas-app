import { publicProcedure, TRPCError } from '../../../create-context';

export const getGameRankingProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🎮 [GAME RANKING] Fetching top 20 rankings from DB');
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

      const result = await ctx.db.query(
        `SELECT username, score, date FROM game_ranking ORDER BY score DESC LIMIT 20`
      );

      console.log('✅ [GAME RANKING] Fetched', result.rows.length, 'entries');
      return result.rows as Array<{ username: string; score: number; date: string }>;
    } catch (error: any) {
      console.error('❌ [GAME RANKING] Error fetching ranking:', error.message);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener el ranking: ${error.message}`,
      });
    }
  });
