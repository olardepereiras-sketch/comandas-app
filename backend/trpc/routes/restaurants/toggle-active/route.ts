import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const toggleRestaurantActiveProcedure = publicProcedure
  .input(z.object({ 
    restaurantId: z.string(),
    isActive: z.boolean(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔄 [TOGGLE ACTIVE] Iniciando cambio de estado:', {
      restaurantId: input.restaurantId,
      newStatus: input.isActive
    });

    const result = await ctx.db.query(
      'UPDATE restaurants SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING is_active',
      [input.isActive, input.restaurantId]
    );

    if (result.rows.length === 0) {
      console.error('❌ [TOGGLE ACTIVE] Restaurante no encontrado:', input.restaurantId);
      throw new Error('Restaurante no encontrado');
    }

    const updatedStatus = result.rows[0].is_active;
    console.log('✅ [TOGGLE ACTIVE] Estado actualizado:', {
      restaurantId: input.restaurantId,
      newStatus: updatedStatus
    });

    return { 
      success: true,
      isActive: Boolean(updatedStatus),
    };
  });
