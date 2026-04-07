import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getAgentStatusProcedure = publicProcedure
  .input(z.object({
    restaurantId: z.string(),
  }))
  .query(async ({ input, ctx }: { input: { restaurantId: string }; ctx: any }) => {
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS comanda_print_agents (
          id SERIAL PRIMARY KEY,
          restaurant_id VARCHAR(255) NOT NULL UNIQUE,
          last_seen TIMESTAMP DEFAULT NOW(),
          agent_version VARCHAR(50)
        )
      `);

      const result = await ctx.db.query(
        `SELECT last_seen, agent_version FROM comanda_print_agents WHERE restaurant_id = $1`,
        [input.restaurantId]
      );

      if (result.rows.length === 0) {
        return { connected: false, lastSeen: null, secondsAgo: null, version: null };
      }

      const lastSeen = new Date(result.rows[0].last_seen as string);
      const secondsAgo = Math.round((Date.now() - lastSeen.getTime()) / 1000);

      return {
        connected: secondsAgo < 30,
        lastSeen: lastSeen.toISOString(),
        secondsAgo,
        version: (result.rows[0].agent_version as string) || null,
      };
    } catch {
      return { connected: false, lastSeen: null, secondsAgo: null, version: null };
    }
  });
