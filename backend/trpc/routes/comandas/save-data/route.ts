import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const saveComandasDataProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    dataType: z.string(),
    data: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log(`📝 [COMANDAS SYNC] Saving ${input.dataType} for restaurant: ${input.restaurantId}`);
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS comandas_sync_data (
          id SERIAL PRIMARY KEY,
          restaurant_id VARCHAR(255) NOT NULL,
          data_type VARCHAR(100) NOT NULL,
          data TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(restaurant_id, data_type)
        )
      `);

      await ctx.db.query(
        `INSERT INTO comandas_sync_data (restaurant_id, data_type, data, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (restaurant_id, data_type)
         DO UPDATE SET data = $3, updated_at = NOW()`,
        [input.restaurantId, input.dataType, input.data]
      );

      console.log(`✅ [COMANDAS SYNC] ${input.dataType} saved`);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ [COMANDAS SYNC] Error saving ${input.dataType}:`, error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
