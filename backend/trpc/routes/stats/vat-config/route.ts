import { publicProcedure, TRPCError } from '../../../create-context';
import { z } from 'zod';

export const getStoreVatConfigProcedure = publicProcedure
  .query(async ({ ctx }) => {
    console.log('🔵 [GET STORE VAT CONFIG] Obteniendo configuración de IVA');

    try {
      await ctx.db.query(
        `ALTER TABLE admin_stripe_config ADD COLUMN IF NOT EXISTS vat_percent DECIMAL(5,2) DEFAULT 21`
      );

      const result = await ctx.db.query(
        'SELECT vat_percent FROM admin_stripe_config WHERE id = $1',
        ['admin-stripe-config']
      );

      if (result.rows.length === 0) {
        return { vatPercent: 21 };
      }

      return {
        vatPercent: result.rows[0].vat_percent ?? 21,
      };
    } catch (error: any) {
      console.error('❌ [GET STORE VAT CONFIG] Error:', error);
      return { vatPercent: 21 };
    }
  });

export const updateStoreVatConfigProcedure = publicProcedure
  .input(
    z.object({
      vatPercent: z.number().min(0).max(100),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('🔵 [UPDATE STORE VAT CONFIG] Actualizando IVA a', input.vatPercent);

    try {
      await ctx.db.query(
        `INSERT INTO admin_stripe_config (id, vat_percent, updated_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET vat_percent = $2, updated_at = $3`,
        ['admin-stripe-config', input.vatPercent, new Date()]
      );

      console.log('✅ [UPDATE STORE VAT CONFIG] IVA actualizado');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [UPDATE STORE VAT CONFIG] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Error al actualizar IVA: ${error.message}`,
      });
    }
  });
