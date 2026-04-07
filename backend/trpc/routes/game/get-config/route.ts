import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getGameConfigProcedure = publicProcedure
  .input(z.object({ restaurantId: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🎮 [GAME CONFIG] Getting config for restaurant:', input.restaurantId);
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS game_config (
          id SERIAL PRIMARY KEY,
          restaurant_id VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          memory_images JSONB DEFAULT '[]',
          trivia_theme VARCHAR(100) DEFAULT 'galicia',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(restaurant_id)
        )
      `);

      const result = await ctx.db.query(
        `SELECT * FROM game_config WHERE restaurant_id = $1`,
        [input.restaurantId]
      );

      if (result.rows.length === 0) {
        await ctx.db.query(
          `INSERT INTO game_config (restaurant_id, is_active, memory_images, trivia_theme)
           VALUES ($1, true, '[]', 'galicia') ON CONFLICT (restaurant_id) DO NOTHING`,
          [input.restaurantId]
        );
        return { restaurantId: input.restaurantId, isActive: true, memoryImages: [] as Array<{ url: string; name: string }>, triviaTheme: 'galicia' };
      }

      const row = result.rows[0];
      return {
        restaurantId: row.restaurant_id,
        isActive: row.is_active as boolean,
        memoryImages: (row.memory_images || []) as Array<{ url: string; name: string }>,
        triviaTheme: (row.trivia_theme || 'galicia') as string,
      };
    } catch (error: any) {
      console.error('❌ [GAME CONFIG] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error al obtener configuración: ${error.message}` });
    }
  });
