import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getGameConfigBySlugProcedure = publicProcedure
  .input(z.object({ slug: z.string() }))
  .query(async ({ input, ctx }) => {
    console.log('🎮 [GAME CONFIG BY SLUG] Getting config for slug:', input.slug);
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

      const restResult = await ctx.db.query(
        `SELECT id, name FROM restaurants WHERE slug = $1 LIMIT 1`,
        [input.slug]
      );

      if (restResult.rows.length === 0) {
        console.log('⚠️ [GAME CONFIG BY SLUG] Restaurant not found for slug:', input.slug);
        return null;
      }

      const restaurant = restResult.rows[0];
      const restaurantId = restaurant.id.toString();

      const cfgResult = await ctx.db.query(
        `SELECT * FROM game_config WHERE restaurant_id = $1`,
        [restaurantId]
      );

      if (cfgResult.rows.length === 0) {
        await ctx.db.query(
          `INSERT INTO game_config (restaurant_id, is_active, memory_images, trivia_theme)
           VALUES ($1, true, '[]', 'galicia') ON CONFLICT (restaurant_id) DO NOTHING`,
          [restaurantId]
        );
        return {
          restaurantId,
          restaurantName: restaurant.name as string,
          isActive: true,
          memoryImages: [] as Array<{ url: string; name: string }>,
          triviaTheme: 'galicia',
        };
      }

      const row = cfgResult.rows[0];
      return {
        restaurantId,
        restaurantName: restaurant.name as string,
        isActive: row.is_active as boolean,
        memoryImages: (row.memory_images || []) as Array<{ url: string; name: string }>,
        triviaTheme: (row.trivia_theme || 'galicia') as string,
      };
    } catch (error: any) {
      console.error('❌ [GAME CONFIG BY SLUG] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error al obtener configuración: ${error.message}` });
    }
  });
