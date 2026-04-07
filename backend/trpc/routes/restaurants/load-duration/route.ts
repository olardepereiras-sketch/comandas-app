import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const loadDurationProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      durationId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [LOAD DURATION] Cargando duración:', input);

    try {
      const durationResult = await ctx.db.query(
        'SELECT months FROM subscription_durations WHERE id = $1',
        [input.durationId]
      );

      if (durationResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Duración no encontrada',
        });
      }

      const duration = durationResult.rows[0];
      const months = Number(duration.months);
      
      const now = new Date();
      let newExpiryDate: Date | null = null;
      let isActive = true;

      if (months === 0) {
        newExpiryDate = new Date(now.getTime() - 1000);
        isActive = false;
        console.log('⚠️ [LOAD DURATION] Duración 0 meses - Marcando restaurante como caducado');
      } else {
        newExpiryDate = new Date(now);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + months);
        console.log('✅ [LOAD DURATION] Nueva fecha de caducidad:', newExpiryDate.toISOString());
      }

      const updateResult = await ctx.db.query(
        `UPDATE restaurants 
         SET subscription_expiry = $1, 
             is_active = $2,
             updated_at = $3 
         WHERE id = $4`,
        [newExpiryDate, isActive, now, input.restaurantId]
      );

      console.log('✅ [LOAD DURATION] Duración cargada:', {
        restaurantId: input.restaurantId,
        months,
        newExpiryDate: newExpiryDate.toISOString(),
        isActive,
        rowsAffected: updateResult.rowCount,
      });

      if ((updateResult.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }

      return {
        success: true,
        subscriptionExpiry: newExpiryDate.toISOString(),
        isActive,
      };
    } catch (error: any) {
      console.error('❌ [LOAD DURATION] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al cargar la duración: ${error.message}`,
      });
    }
  });
