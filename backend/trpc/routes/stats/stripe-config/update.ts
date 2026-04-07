import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateAdminStripeConfigProcedure = publicProcedure
  .input(
    z.object({
      stripeSecretKey: z.string().optional(),
      stripePublishableKey: z.string().optional(),
      stripeEnabled: z.boolean().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE ADMIN STRIPE CONFIG] Actualizando configuración de Stripe del admin');

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (input.stripeSecretKey !== undefined) {
      updates.push(`stripe_secret_key = $${paramCount++}`);
      params.push(input.stripeSecretKey);
    }

    if (input.stripePublishableKey !== undefined) {
      updates.push(`stripe_publishable_key = $${paramCount++}`);
      params.push(input.stripePublishableKey);
    }

    if (input.stripeEnabled !== undefined) {
      updates.push(`stripe_enabled = $${paramCount++}`);
      params.push(input.stripeEnabled);
    }

    if (updates.length === 0) {
      console.log('⚠️ [UPDATE ADMIN STRIPE CONFIG] No hay cambios para actualizar');
      return { success: true };
    }

    updates.push(`updated_at = $${paramCount++}`);
    params.push(new Date());

    const whereParamIndex = paramCount++;
    params.push('admin-stripe-config');

    const sql = `
      INSERT INTO admin_stripe_config (id, ${updates.map((u, i) => u.split(' = ')[0]).join(', ')})
      VALUES ($${whereParamIndex}, ${updates.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}
    `;

    try {
      await ctx.db.query(sql, params);
      console.log('✅ [UPDATE ADMIN STRIPE CONFIG] Configuración actualizada');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [UPDATE ADMIN STRIPE CONFIG] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar configuración de Stripe: ${error.message}`,
      });
    }
  });