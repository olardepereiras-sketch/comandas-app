import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { Province } from '@/types';

export const updateProvinceProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'El nombre es requerido'),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const checkResult = await ctx.db.query(
      'SELECT * FROM provinces WHERE id = $1',
      [input.id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Provincia no encontrada');
    }

    await ctx.db.query(
      'UPDATE provinces SET name = $1 WHERE id = $2',
      [input.name, input.id]
    );

    const row = checkResult.rows[0] as any;
    const updated: Province = {
      id: row.id,
      name: input.name,
      createdAt: row.created_at || new Date().toISOString(),
    };
    
    console.log('✅ Provincia actualizada en BD:', updated);
    
    return updated;
  });
