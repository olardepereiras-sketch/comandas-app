import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const generateComandasTokenProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔑 [COMANDAS TOKEN] Generating token for restaurant:', input.restaurantId);
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS comandas_access_tokens (
          id SERIAL PRIMARY KEY,
          restaurant_id VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (tableErr: any) {
      console.warn('⚠️ [COMANDAS TOKEN] Table creation warning:', tableErr.message);
    }

    try {
      const existing = await ctx.db.query(
        `SELECT token FROM comandas_access_tokens WHERE restaurant_id = $1 LIMIT 1`,
        [input.restaurantId]
      );

      if (existing.rows.length > 0) {
        const existingToken = existing.rows[0].token as string;
        console.log('✅ [COMANDAS TOKEN] Existing token found:', existingToken.slice(0, 8) + '...');
        return { token: existingToken };
      }

      const token = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      await ctx.db.query(
        `INSERT INTO comandas_access_tokens (restaurant_id, token) VALUES ($1, $2)`,
        [input.restaurantId, token]
      );

      console.log('✅ [COMANDAS TOKEN] New token generated:', token.slice(0, 8) + '...');
      return { token };
    } catch (error: any) {
      console.error('❌ [COMANDAS TOKEN] Error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
