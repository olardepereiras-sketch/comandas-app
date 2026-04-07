import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const validateComandasTokenProcedure = publicProcedure
  .input(z.object({
    token: z.string(),
  }))
  .query(async ({ input, ctx }) => {
    console.log('🔑 [COMANDAS VALIDATE] Validating token:', input.token?.slice(0, 12) + '...');
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
      console.warn('⚠️ [COMANDAS VALIDATE] Table creation warning (may already exist):', tableErr.message);
    }

    try {
      const result = await ctx.db.query(
        `SELECT cat.restaurant_id, r.name as restaurant_name, r.slug as restaurant_slug
         FROM comandas_access_tokens cat
         LEFT JOIN restaurants r ON r.id = cat.restaurant_id
         WHERE cat.token = $1
         LIMIT 1`,
        [input.token]
      );

      if (result.rows.length === 0) {
        console.log('⚠️ [COMANDAS VALIDATE] Token not found in DB');
        return null;
      }

      const row = result.rows[0];
      console.log('✅ [COMANDAS VALIDATE] Token valid for restaurant:', row.restaurant_name || row.restaurant_id);
      return {
        restaurantId: row.restaurant_id as string,
        restaurantName: (row.restaurant_name || row.restaurant_id) as string,
        restaurantSlug: (row.restaurant_slug || '') as string,
      };
    } catch (error: any) {
      console.error('❌ [COMANDAS VALIDATE] Query error:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Error validando token: ${error.message}` });
    }
  });
