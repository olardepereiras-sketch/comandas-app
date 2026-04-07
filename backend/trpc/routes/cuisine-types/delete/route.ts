import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteCuisineTypeProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE CUISINE TYPE] Eliminando tipo de cocina:', input.id);

    await ctx.db.query(
      'DELETE FROM province_cuisine_types WHERE cuisine_type_id = $1',
      [input.id]
    );
    console.log('✅ [DELETE CUISINE TYPE] Eliminado de province_cuisine_types');

    const restaurantsResult = await ctx.db.query(
      `SELECT id, cuisine_type FROM restaurants WHERE cuisine_type IS NOT NULL AND cuisine_type != '[]' AND cuisine_type != ''`
    );

    let affectedCount = 0;
    for (const row of restaurantsResult.rows) {
      let types: string[] = [];
      try {
        const parsed = typeof row.cuisine_type === 'string'
          ? JSON.parse(row.cuisine_type)
          : row.cuisine_type;
        if (Array.isArray(parsed)) {
          types = parsed;
        }
      } catch {
        continue;
      }

      const hasType = types.some((t: string) => {
        const normalizedT = t.replace(/^cuisine-/, '').toLowerCase();
        const normalizedId = input.id.replace(/^cuisine-/, '').toLowerCase();
        return t === input.id || normalizedT === normalizedId;
      });

      if (hasType) {
        const filtered = types.filter((t: string) => {
          const normalizedT = t.replace(/^cuisine-/, '').toLowerCase();
          const normalizedId = input.id.replace(/^cuisine-/, '').toLowerCase();
          return t !== input.id && normalizedT !== normalizedId;
        });
        await ctx.db.query(
          `UPDATE restaurants SET cuisine_type = $1 WHERE id = $2`,
          [JSON.stringify(filtered), row.id]
        );
        affectedCount++;
        console.log(`✅ [DELETE CUISINE TYPE] Removido de restaurante ${row.id}`);
      }
    }

    const result = await ctx.db.query(
      'DELETE FROM cuisine_types WHERE id = $1 RETURNING id',
      [input.id]
    );

    if (result.rowCount === 0) {
      throw new Error('Tipo de cocina no encontrado');
    }

    console.log('✅ [DELETE CUISINE TYPE] Tipo de cocina eliminado y removido de', affectedCount, 'restaurantes');

    return {
      success: true,
      affectedRestaurants: affectedCount,
      message: affectedCount > 0
        ? `Tipo de cocina eliminado. Se ha removido de ${affectedCount} restaurante(s).`
        : 'Tipo de cocina eliminado correctamente.'
    };
  });
