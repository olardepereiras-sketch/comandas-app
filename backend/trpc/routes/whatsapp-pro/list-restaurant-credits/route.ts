import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const listRestaurantWhatsappCreditsProcedure = publicProcedure
  .input(z.object({ restaurantId: z.string().optional() }).optional())
  .query(async ({ input, ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Listando créditos restaurantes');
    try {
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_type TEXT DEFAULT 'free'`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_credits INTEGER DEFAULT 0`);
      await ctx.db.query(`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS whatsapp_pro_alert_threshold INTEGER DEFAULT 0`);

      let sql = `
        SELECT r.id, r.name, r.email,
               COALESCE(r.whatsapp_type, 'free') as whatsapp_type,
               COALESCE(r.whatsapp_pro_credits, 0) as whatsapp_pro_credits,
               COALESCE(r.whatsapp_pro_alert_threshold, 0) as whatsapp_pro_alert_threshold
        FROM restaurants r
        WHERE 1=1
      `;
      const params: any[] = [];

      if (input?.restaurantId) {
        sql += ` AND r.id = $1`;
        params.push(input.restaurantId);
      } else {
        sql += ` ORDER BY r.name ASC`;
      }

      const result = await ctx.db.query(sql, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name || '',
        email: row.email || '',
        whatsappType: (row.whatsapp_type || 'free') as 'free' | 'paid',
        whatsappProCredits: Number(row.whatsapp_pro_credits) || 0,
        whatsappProAlertThreshold: Number(row.whatsapp_pro_alert_threshold) || 0,
      }));
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error listando créditos:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
