import { publicProcedure } from '../../../create-context';
import { z } from 'zod';

export const getExpiryConfigProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔍 [EXPIRY CONFIG] Obteniendo configuración de alertas');
    
    try {
      const result = await ctx.db.query(
        'SELECT expiry_alert_days FROM subscription_config WHERE id = 1'
      );

      if (result.rows.length === 0) {
        return { expiryAlertDays: 15 };
      }

      return {
        expiryAlertDays: result.rows[0].expiry_alert_days
      };
    } catch (error) {
      console.error('❌ [EXPIRY CONFIG] Error:', error);
      return { expiryAlertDays: 15 };
    }
  });

export const updateExpiryConfigProcedure = publicProcedure
  .input(
    z.object({
      expiryAlertDays: z.number().min(1).max(90),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔧 [EXPIRY CONFIG] Actualizando configuración:', input);

    try {
      await ctx.db.query(
        `INSERT INTO subscription_config (id, expiry_alert_days, updated_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE
         SET expiry_alert_days = $1, updated_at = NOW()`,
        [input.expiryAlertDays]
      );

      console.log('✅ [EXPIRY CONFIG] Configuración actualizada');
      return { success: true };
    } catch (error) {
      console.error('❌ [EXPIRY CONFIG] Error:', error);
      throw new Error('No se pudo actualizar la configuración');
    }
  });
