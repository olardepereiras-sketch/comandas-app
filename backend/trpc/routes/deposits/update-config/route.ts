import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateDepositsConfigProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      depositsEnabled: z.boolean().optional(),
      depositsApplyToAllDays: z.boolean().optional(),
      depositsDefaultAmount: z.number().optional(),
      depositsStripeAccountId: z.string().optional(),
      depositsStripeSecretKey: z.string().optional(),
      depositsStripePublishableKey: z.string().optional(),
      depositsCustomMessage: z.string().optional(),
      depositsIncludeHighChairs: z.boolean().optional(),
      depositsSpecificDays: z.array(
        z.object({
          date: z.string(),
          amount: z.number(),
          customMessage: z.string().optional(),
        })
      ).optional(),
      depositsManagementFeeEnabled: z.boolean().optional(),
      depositsManagementFeePercent: z.number().min(0).max(100).optional(),
      depositsCancellationHours: z.number().min(0).optional(),
      depositsAutoRefund: z.boolean().optional(),
      depositsCancellationPolicy: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE DEPOSITS CONFIG] Actualizando configuración de fianzas:', input.restaurantId);

    try {
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_management_fee_enabled BOOLEAN DEFAULT FALSE`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_management_fee_percent DECIMAL(5,2) DEFAULT 0`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_cancellation_hours INTEGER DEFAULT 0`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_auto_refund BOOLEAN DEFAULT FALSE`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS deposits_cancellation_policy TEXT`);
    } catch (e) {}

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.depositsEnabled !== undefined) {
      updates.push(`deposits_enabled = $${paramCount++}`);
      params.push(input.depositsEnabled);
    }
    if (input.depositsApplyToAllDays !== undefined) {
      updates.push(`deposits_apply_to_all_days = $${paramCount++}`);
      params.push(input.depositsApplyToAllDays);
    }
    if (input.depositsDefaultAmount !== undefined) {
      updates.push(`deposits_default_amount = $${paramCount++}`);
      params.push(input.depositsDefaultAmount);
    }
    if (input.depositsStripeAccountId !== undefined) {
      updates.push(`deposits_stripe_account_id = $${paramCount++}`);
      params.push(input.depositsStripeAccountId);
    }
    if (input.depositsStripeSecretKey !== undefined) {
      updates.push(`deposits_stripe_secret_key = $${paramCount++}`);
      params.push(input.depositsStripeSecretKey);
    }
    if (input.depositsStripePublishableKey !== undefined) {
      updates.push(`deposits_stripe_publishable_key = $${paramCount++}`);
      params.push(input.depositsStripePublishableKey);
    }
    if (input.depositsCustomMessage !== undefined) {
      updates.push(`deposits_custom_message = $${paramCount++}`);
      params.push(input.depositsCustomMessage);
    }
    if (input.depositsIncludeHighChairs !== undefined) {
      updates.push(`deposits_include_high_chairs = $${paramCount++}`);
      params.push(input.depositsIncludeHighChairs);
    }
    if (input.depositsSpecificDays !== undefined) {
      updates.push(`deposits_specific_days = $${paramCount++}`);
      params.push(JSON.stringify(input.depositsSpecificDays));
    }
    if (input.depositsManagementFeeEnabled !== undefined) {
      updates.push(`deposits_management_fee_enabled = $${paramCount++}`);
      params.push(input.depositsManagementFeeEnabled);
    }
    if (input.depositsManagementFeePercent !== undefined) {
      updates.push(`deposits_management_fee_percent = $${paramCount++}`);
      params.push(input.depositsManagementFeePercent);
    }
    if (input.depositsCancellationHours !== undefined) {
      updates.push(`deposits_cancellation_hours = $${paramCount++}`);
      params.push(input.depositsCancellationHours);
    }
    if (input.depositsAutoRefund !== undefined) {
      updates.push(`deposits_auto_refund = $${paramCount++}`);
      params.push(input.depositsAutoRefund);
    }
    if (input.depositsCancellationPolicy !== undefined) {
      updates.push(`deposits_cancellation_policy = $${paramCount++}`);
      params.push(input.depositsCancellationPolicy);
    }

    if (updates.length === 0) {
      console.log('⚠️ [UPDATE DEPOSITS CONFIG] No hay cambios para actualizar');
      return { success: true };
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    const whereParamIndex = paramCount++;
    params.push(input.restaurantId);

    const sql = `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${whereParamIndex}`;

    console.log('🔵 [UPDATE DEPOSITS CONFIG] SQL:', sql);

    try {
      const result = await ctx.db.query(sql, params);

      if ((result.rowCount || 0) === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Restaurante no encontrado',
        });
      }

      console.log('✅ [UPDATE DEPOSITS CONFIG] Configuración de fianzas actualizada');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [UPDATE DEPOSITS CONFIG] Error:', error.message);
      if (error.code === 'NOT_FOUND') throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar configuración de fianzas: ${error.message}`,
      });
    }
  });
