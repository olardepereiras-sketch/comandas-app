import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const listBlockedClientsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      phone: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [LIST BLOCKED] Listando clientes bloqueados para:', input.restaurantId);

    let query = `
      SELECT id, name, phone, restaurant_blocks, created_at
      FROM clients
      WHERE restaurant_blocks IS NOT NULL
        AND restaurant_blocks::text != '{}'
        AND restaurant_blocks::text != 'null'
    `;
    const params: unknown[] = [];

    if (input.phone) {
      params.push(`%${input.phone}%`);
      query += ` AND phone ILIKE $${params.length}`;
    }

    query += ' ORDER BY name ASC';

    const result = await ctx.db.query(query, params);

    const blocked: Array<{
      id: string;
      name: string;
      phone: string;
      blockedAt: string;
      reason: string;
    }> = [];

    for (const row of result.rows as any[]) {
      let blocks: Record<string, any> = {};
      try {
        blocks = typeof row.restaurant_blocks === 'string'
          ? JSON.parse(row.restaurant_blocks)
          : (row.restaurant_blocks || {});
      } catch {
        blocks = {};
      }

      const blockEntry = blocks[input.restaurantId];
      if (blockEntry && blockEntry.isBlocked) {
        blocked.push({
          id: row.id as string,
          name: row.name as string || 'Sin nombre',
          phone: row.phone as string || '',
          blockedAt: blockEntry.blockedAt || new Date(row.created_at as string).toISOString(),
          reason: blockEntry.reason || 'manual',
        });
      }
    }

    console.log(`✅ [LIST BLOCKED] Clientes bloqueados encontrados: ${blocked.length}`);
    return blocked;
  });
