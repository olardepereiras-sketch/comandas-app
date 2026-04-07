import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

const inFlightLoadRequests = new Map<string, Promise<{ data: Record<string, { data: string; updatedAt: string }> }>>();

export const loadComandasDataProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
    dataTypes: z.array(z.string()),
    since: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    const sortedDataTypes = [...input.dataTypes].sort();
    const requestKey = JSON.stringify({
      restaurantId: input.restaurantId,
      dataTypes: sortedDataTypes,
      since: input.since ?? null,
    });

    const existingRequest = inFlightLoadRequests.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const loadPromise = (async () => {
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

      let query: string;
      let params: any[];

      if (input.since) {
        query = `SELECT data_type, data, updated_at FROM comandas_sync_data
                 WHERE restaurant_id = $1 AND data_type = ANY($2) AND updated_at > $3
                 ORDER BY updated_at DESC`;
        params = [input.restaurantId, sortedDataTypes, input.since];
      } else {
        query = `SELECT data_type, data, updated_at FROM comandas_sync_data
                 WHERE restaurant_id = $1 AND data_type = ANY($2)
                 ORDER BY updated_at DESC`;
        params = [input.restaurantId, sortedDataTypes];
      }

      const result = await ctx.db.query(query, params);

      const dataMap: Record<string, { data: string; updatedAt: string }> = {};
      for (const row of result.rows) {
        dataMap[row.data_type as string] = {
          data: row.data as string,
          updatedAt: (row.updated_at as Date).toISOString(),
        };
      }

      return { data: dataMap };
    } catch (error: any) {
      console.error(`❌ [COMANDAS SYNC] Error loading data:`, error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    } finally {
      inFlightLoadRequests.delete(requestKey);
    }
    })();

    inFlightLoadRequests.set(requestKey, loadPromise);
    return loadPromise;
  });
