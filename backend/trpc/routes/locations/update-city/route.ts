import { publicProcedure } from '../../../create-context';
import { z } from 'zod';
import type { City } from '@/types';

export const updateCityProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'El nombre es requerido'),
      provinceId: z.string().min(1, 'La provincia es requerida'),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const checkResult = await ctx.db.query(
      'SELECT * FROM cities WHERE id = $1',
      [input.id]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Ciudad no encontrada');
    }

    await ctx.db.query(
      'UPDATE cities SET name = $1, province_id = $2 WHERE id = $3',
      [input.name, input.provinceId, input.id]
    );

    const row = checkResult.rows[0] as any;
    const updated: City = {
      id: row.id,
      name: input.name,
      provinceId: input.provinceId,
      createdAt: row.created_at || new Date().toISOString(),
    };
    
    console.log('✅ Ciudad actualizada en BD:', updated);
    
    return updated;
  });
