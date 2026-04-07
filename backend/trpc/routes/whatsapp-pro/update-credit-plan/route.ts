import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateWhatsappCreditPlanProcedure = publicProcedure
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      priceWithoutVat: z.number().min(0).optional(),
      sendsCount: z.number().int().min(1).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Actualizando plan:', input.id);
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let pc = 1;

      if (input.name !== undefined) { updates.push(`name = $${pc++}`); params.push(input.name); }
      if (input.priceWithoutVat !== undefined) { updates.push(`price_without_vat = $${pc++}`); params.push(input.priceWithoutVat); }
      if (input.sendsCount !== undefined) { updates.push(`sends_count = $${pc++}`); params.push(input.sendsCount); }

      if (updates.length === 0) return { success: true };

      updates.push(`updated_at = $${pc++}`);
      params.push(new Date());
      params.push(input.id);

      await ctx.db.query(
        `UPDATE whatsapp_credit_plans SET ${updates.join(', ')} WHERE id = $${pc}`,
        params
      );
      console.log('✅ [WHATSAPP PRO] Plan actualizado');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error actualizando plan:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
