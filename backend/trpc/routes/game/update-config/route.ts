import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateGameConfigProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    isActive: z.boolean().optional(),
    memoryImages: z.array(z.object({ url: z.string(), name: z.string() })).optional(),
    triviaTheme: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🎮 [GAME CONFIG UPDATE] Updating config for restaurant:', input.restaurantId);
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

      await ctx.db.query(
        `INSERT INTO game_config (restaurant_id, is_active, memory_images, trivia_theme)
         VALUES ($1, COALESCE($2, true), COALESCE($3::jsonb, '[]'::jsonb), COALESCE($4, 'galicia'))
         ON CONFLICT (restaurant_id) DO UPDATE SET
           is_active = CASE WHEN $2 IS NOT NULL THEN $2::boolean ELSE game_config.is_active END,
           memory_images = CASE WHEN $3 IS NOT NULL THEN $3::jsonb ELSE game_config.memory_images END,
           trivia_theme = CASE WHEN $4 IS NOT NULL THEN $4 ELSE game_config.trivia_theme END,
           updated_at = NOW()`,
        [
          input.restaurantId,
          input.isActive !== undefined ? input.isActive : null,
          input.memoryImages !== undefined ? JSON.stringify(input.memoryImages) : null,
          input.triviaTheme !== undefined ? input.triviaTheme : null,
        ]
      );

      console.log('✅ [GAME CONFIG UPDATE] Config updated');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [GAME CONFIG UPDATE] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error al actualizar configuración: ${error.message}` });
    }
  });
