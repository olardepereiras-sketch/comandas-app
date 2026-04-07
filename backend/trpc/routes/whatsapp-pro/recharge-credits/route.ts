import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const rechargeWhatsappCreditsProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      creditsToAdd: z.number().int().min(1),
      planId: z.string().optional(),
      planName: z.string().optional(),
      amountPaid: z.number().min(0).optional(),
      notes: z.string().optional(),
      rechargeType: z.enum(['manual', 'purchase']).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Recargando créditos:', input.restaurantId, '+', input.creditsToAdd);
    try {
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_credits INTEGER DEFAULT 0`);

      await ctx.db.query(
        `UPDATE restaurants SET whatsapp_pro_credits = COALESCE(whatsapp_pro_credits, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [input.creditsToAdd, input.restaurantId]
      );

      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_credit_history (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          credits_added INTEGER NOT NULL DEFAULT 0,
          plan_id TEXT,
          plan_name TEXT,
          recharge_type TEXT DEFAULT 'manual',
          amount_paid DECIMAL(10,2) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await ctx.db.query(
        `INSERT INTO whatsapp_credit_history (id, restaurant_id, credits_added, plan_id, plan_name, recharge_type, amount_paid, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          input.restaurantId,
          input.creditsToAdd,
          input.planId || null,
          input.planName || null,
          input.rechargeType || 'manual',
          input.amountPaid || 0,
          input.notes || null,
        ]
      );

      const result = await ctx.db.query(
        'SELECT whatsapp_pro_credits FROM restaurants WHERE id = $1',
        [input.restaurantId]
      );

      const newBalance = result.rows[0]?.whatsapp_pro_credits || 0;
      console.log('✅ [WHATSAPP PRO] Créditos recargados. Nuevo saldo:', newBalance);
      return { success: true, newBalance };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error recargando créditos:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
