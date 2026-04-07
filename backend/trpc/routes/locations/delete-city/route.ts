import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const deleteCityProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [DELETE CITY] Iniciando borrado:', input.id);

    const cityResult = await ctx.db.query(
      'SELECT * FROM cities WHERE id = $1',
      [input.id]
    );
    
    if (cityResult.rows.length === 0) {
      console.log('❌ [DELETE CITY] Ciudad no encontrada');
      throw new Error('Ciudad no encontrada');
    }

    const restaurantsResult = await ctx.db.query(
      'SELECT COUNT(*) as count FROM restaurants WHERE city_id = $1',
      [input.id]
    );

    const restaurantCount = parseInt(restaurantsResult.rows[0]?.count || '0');
    
    if (restaurantCount > 0) {
      throw new Error(`No se puede eliminar la población porque tiene ${restaurantCount} restaurante(s) asignado(s). Elimine primero los restaurantes o cámbielos de población.`);
    }

    const result = await ctx.db.query(
      'DELETE FROM cities WHERE id = $1 RETURNING id',
      [input.id]
    );
    
    console.log('✅ [DELETE CITY] Ciudad eliminada:', {
      id: input.id,
      rowsAffected: result.rowCount,
    });
    
    return { success: true, rowsAffected: result.rowCount || 0 };
  });
