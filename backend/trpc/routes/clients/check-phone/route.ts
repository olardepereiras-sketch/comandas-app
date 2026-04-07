import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const checkPhoneProcedure = publicProcedure
  .input(
    z.object({
      phone: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    const result = await ctx.db.query(
      'SELECT id, name, phone FROM clients WHERE phone = $1',
      [input.phone]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      return {
        exists: true,
        client: {
          id: row.id,
          name: row.name,
          phone: row.phone,
        },
      };
    }
    
    return {
      exists: false,
      client: null,
    };
  });
