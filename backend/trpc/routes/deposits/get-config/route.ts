import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getDepositsConfigProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [GET DEPOSITS CONFIG] Obteniendo configuración de fianzas:', input.restaurantId);

    try {
      try {
        await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_management_fee_enabled BOOLEAN DEFAULT FALSE`);
        await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_management_fee_percent DECIMAL(5,2) DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_cancellation_hours INTEGER DEFAULT 0`);
        await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_auto_refund BOOLEAN DEFAULT FALSE`);
        await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_cancellation_policy TEXT`);
      } catch (e) {}

      const result = await ctx.db.query(
        `SELECT 
          deposits_enabled,
          deposits_apply_to_all_days,
          deposits_default_amount,
          deposits_stripe_account_id,
          deposits_stripe_publishable_key,
          deposits_stripe_secret_key,
          deposits_custom_message,
          deposits_specific_days,
          deposits_include_high_chairs,
          deposits_management_fee_enabled,
          deposits_management_fee_percent,
          deposits_cancellation_hours,
          deposits_auto_refund,
          deposits_cancellation_policy
        FROM restaurants 
        WHERE id = $1`,
        [input.restaurantId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }

      const row = result.rows[0];

      return {
        depositsEnabled: row.deposits_enabled || false,
        depositsApplyToAllDays: row.deposits_apply_to_all_days !== false,
        depositsDefaultAmount: parseFloat(row.deposits_default_amount || '0'),
        depositsStripeAccountId: row.deposits_stripe_account_id || '',
        depositsStripePublishableKey: row.deposits_stripe_publishable_key || '',
        depositsStripeSecretKey: row.deposits_stripe_secret_key ? '••••••••' : '',
        depositsCustomMessage: row.deposits_custom_message || '',
        depositsIncludeHighChairs: row.deposits_include_high_chairs !== false,
        depositsSpecificDays: row.deposits_specific_days ?
          (typeof row.deposits_specific_days === 'string' ?
            JSON.parse(row.deposits_specific_days) :
            row.deposits_specific_days) :
          [],
        depositsManagementFeeEnabled: row.deposits_management_fee_enabled || false,
        depositsManagementFeePercent: parseFloat(row.deposits_management_fee_percent || '0'),
        depositsCancellationHours: parseInt(row.deposits_cancellation_hours || '0'),
        depositsAutoRefund: row.deposits_auto_refund || false,
        depositsCancellationPolicy: row.deposits_cancellation_policy || '',
      };
    } catch (error: any) {
      console.error('❌ [GET DEPOSITS CONFIG] Error:', error);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener configuración de fianzas: ${error.message}`,
      });
    }
  });
