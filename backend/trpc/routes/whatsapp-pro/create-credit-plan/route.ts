import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const createWhatsappCreditPlanProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1),
      priceWithoutVat: z.number().min(0),
      sendsCount: z.number().int().min(1),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Creando plan de créditos:', input.name);
    try {
      const id = randomUUID();
      await ctx.db.query(
        `INSERT INTO whatsapp_credit_plans (id, name, price_without_vat, sends_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [id, input.name, input.priceWithoutVat, input.sendsCount]
      );
      console.log('✅ [WHATSAPP PRO] Plan creado:', id);
      return { success: true, id };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error creando plan:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
