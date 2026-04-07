import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const updateRestaurantWhatsappConfigProcedure = publicProcedure
  .input(
    z.object({
      restaurantId: z.string(),
      whatsappType: z.enum(['free', 'paid']).optional(),
      whatsappProAlertThreshold: z.number().int().min(0).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Actualizando config WhatsApp restaurante:', input.restaurantId);
    try {
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_type TEXT DEFAULT 'free'`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_alert_threshold INTEGER DEFAULT 0`);

      const updates: string[] = [];
      const params: any[] = [];
      let pc = 1;

      if (input.whatsappType !== undefined) { updates.push(`whatsapp_type = $${pc++}`); params.push(input.whatsappType); }
      if (input.whatsappProAlertThreshold !== undefined) { updates.push(`whatsapp_pro_alert_threshold = $${pc++}`); params.push(input.whatsappProAlertThreshold); }

      if (updates.length === 0) return { success: true };

      updates.push(`updated_at = $${pc++}`);
      params.push(new Date());
      params.push(input.restaurantId);

      await ctx.db.query(
        `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${pc}`,
        params
      );
      console.log('✅ [WHATSAPP PRO] Config WhatsApp restaurante actualizada');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error actualizando config restaurante:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
