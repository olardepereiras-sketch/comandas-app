import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const mergeCuisineTypesProcedure = publicProcedure
  .input(
    z.object({
      keepId: z.string(),
      mergeIds: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [MERGE CUISINE TYPES] Fusionando:', input.mergeIds, '→', input.keepId);

    const restaurantsResult = await ctx.db.query(
      `SELECT id, name, cuisine_type FROM restaurants WHERE cuisine_type IS NOT NULL`
    );

    let updatedRestaurants = 0;

    for (const row of restaurantsResult.rows) {
      let types: string[] = [];
      try {
        types = row.cuisine_type ? JSON.parse(row.cuisine_type) : [];
      } catch {
        types = [];
      }

      let changed = false;
      const newTypes = types.map((t: string) => {
        const cleanT = t.replace(/^cuisine-/, '');
        for (const mergeId of input.mergeIds) {
          const cleanMerge = mergeId.replace(/^cuisine-/, '');
          if (cleanT === cleanMerge || t === mergeId) {
            changed = true;
            return input.keepId;
          }
        }
        return t;
      });

      const deduped = [...new Set(newTypes)];

      if (changed) {
        await ctx.db.query(
          `UPDATE restaurants SET cuisine_type = $1 WHERE id = $2`,
          [JSON.stringify(deduped), row.id]
        );
        updatedRestaurants++;
        console.log(`✅ [MERGE] Restaurante "${row.name}" actualizado: ${JSON.stringify(deduped)}`);
      }
    }

    for (const mergeId of input.mergeIds) {
      const existingAssign = await ctx.db.query(
        `SELECT * FROM province_cuisine_types WHERE cuisine_type_id = $1`,
        [mergeId]
      );

      for (const assign of existingAssign.rows) {
        const alreadyExists = await ctx.db.query(
          `SELECT id FROM province_cuisine_types WHERE province_id = $1 AND cuisine_type_id = $2`,
          [assign.province_id, input.keepId]
        );
        if (alreadyExists.rowCount === 0) {
          await ctx.db.query(
            `INSERT INTO province_cuisine_types (id, province_id, cuisine_type_id, created_at) VALUES ($1, $2, $3, $4)`,
            [`pct-${Date.now()}-${Math.random().toString(36).substring(7)}`, assign.province_id, input.keepId, new Date()]
          );
        }
      }

      await ctx.db.query(`DELETE FROM province_cuisine_types WHERE cuisine_type_id = $1`, [mergeId]);
      await ctx.db.query(`DELETE FROM cuisine_types WHERE id = $1`, [mergeId]);
      console.log(`🗑️ [MERGE] Tipo eliminado: ${mergeId}`);
    }

    console.log(`✅ [MERGE CUISINE TYPES] Completado. ${updatedRestaurants} restaurantes actualizados`);

    return {
      success: true,
      updatedRestaurants,
      message: `Fusión completada. ${updatedRestaurants} restaurante(s) actualizados.`,
    };
  });
