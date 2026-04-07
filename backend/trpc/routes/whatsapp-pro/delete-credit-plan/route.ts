import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const deleteWhatsappCreditPlanProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Eliminando plan:', input.id);
    try {
      await ctx.db.query('DELETE FROM whatsapp_credit_plans WHERE id = $1', [input.id]);
      console.log('✅ [WHATSAPP PRO] Plan eliminado');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error eliminando plan:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
