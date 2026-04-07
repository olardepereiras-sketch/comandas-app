import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const setVipProcedure = publicProcedure
  .input(
    z.object({
      clientId: z.string(),
      isVip: z.boolean(),
      preferredTableIds: z.array(z.string()).optional(),
      vipNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [SET VIP] Configurando cliente VIP:', input);

    try {
      const preferredTables = input.preferredTableIds ? JSON.stringify(input.preferredTableIds) : null;

      await ctx.db.query(
        `UPDATE clients 
         SET is_vip = $1, 
             preferred_table_ids = $2, 
             vip_notes = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [input.isVip, preferredTables, input.vipNotes || null, input.clientId]
      );

      console.log(`✅ [SET VIP] Cliente ${input.isVip ? 'marcado como VIP' : 'desmarcado como VIP'}`);

      return {
        success: true,
        message: input.isVip ? 'Cliente marcado como VIP' : 'Cliente desmarcado como VIP',
      };
    } catch (error: any) {
      console.error('❌ [SET VIP] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al configurar cliente VIP: ${error.message}`,
      });
    }
  });
