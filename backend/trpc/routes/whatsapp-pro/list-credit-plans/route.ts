import { publicProcedure, TRPCError } from '../../../create-context';

export const listWhatsappCreditPlansProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [WHATSAPP PRO] Listando planes de créditos');
    try {
      await ctx.db.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_credit_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price_without_vat DECIMAL(10,2) NOT NULL DEFAULT 0,
          sends_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      const result = await ctx.db.query(
        'SELECT * FROM whatsapp_credit_plans ORDER BY sends_count ASC'
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name || '',
        priceWithoutVat: Number(row.price_without_vat) || 0,
        sendsCount: Number(row.sends_count) || 0,
        createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
      }));
    } catch (error: any) {
      console.error('❌ [WHATSAPP PRO] Error listando planes:', error.message);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
