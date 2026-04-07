import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getVipInfoProcedure = publicProcedure
  .input(
    z.object({
      clientId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    console.log('🔵 [GET VIP INFO] Obteniendo info VIP del cliente:', input.clientId);

    try {
      const result = await ctx.db.query(
        `SELECT is_vip, preferred_table_ids, vip_notes FROM clients WHERE id = $1`,
        [input.clientId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente no encontrado',
        });
      }

      const client = result.rows[0];
      let preferredTableIds: string[] = [];
      
      if (client.preferred_table_ids) {
        try {
          preferredTableIds = JSON.parse(client.preferred_table_ids);
        } catch (e) {
          preferredTableIds = [];
        }
      }

      console.log('✅ [GET VIP INFO] Info obtenida');

      return {
        isVip: Boolean(client.is_vip),
        preferredTableIds,
        vipNotes: client.vip_notes ? String(client.vip_notes) : '',
      };
    } catch (error: any) {
      console.error('❌ [GET VIP INFO] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al obtener info VIP: ${error.message}`,
      });
    }
  });
