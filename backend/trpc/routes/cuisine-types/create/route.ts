import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const createCuisineTypeProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [CREATE CUISINE TYPE] Creando tipo de cocina:', input.name);

    const id = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');

    await ctx.db.query(
      `INSERT INTO cuisine_types (id, name, created_at)
       VALUES ($1, $2, $3)`,
      [id, input.name, new Date()]
    );

    console.log('✅ [CREATE CUISINE TYPE] Tipo de cocina creado:', id);

    return {
      id,
      name: input.name,
      createdAt: new Date(),
    };
  });
